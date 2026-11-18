import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useCreateCycle, useUpdateCycle } from '../hooks/useCycleMutations';
import { CYCLE_TYPES, CYCLE_TYPE_LABELS } from '../types/cycles';
import type { Cycle } from '../types/cycles';
import {
	changedFields,
	cycleYearWarning,
	toCycleInput,
	toFormValues,
	validateCycleForm,
} from '../utils/cycles';
import type { CycleFormErrors, CycleFormField, CycleFormValues } from '../utils/cycles';
import { ConfirmDialog } from './ConfirmDialog';
import { Alert, TextField } from './FormControls';
import { Modal } from './Modal';
import { SelectField } from './SelectField';

export type CycleFormMode = { kind: 'create' } | { kind: 'edit'; cycle: Cycle };

interface CycleFormModalProps {
	mode: CycleFormMode;
	onClose: () => void;
}

const FORM_FIELDS: CycleFormField[] = ['name', 'type', 'year', 'startDate', 'endDate'];

function initialValues(mode: CycleFormMode): CycleFormValues {
	if (mode.kind === 'edit') return toFormValues(mode.cycle);
	return {
		name: '',
		type: 'annual',
		year: String(new Date().getFullYear()),
		startDate: '',
		endDate: '',
	};
}

export function CycleFormModal({ mode, onClose }: CycleFormModalProps) {
	const create = useCreateCycle();
	const update = useUpdateCycle();
	const formRef = useRef<HTMLFormElement>(null);
	const [values, setValues] = useState<CycleFormValues>(() => initialValues(mode));
	const [errors, setErrors] = useState<CycleFormErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [yearWarning, setYearWarning] = useState<string | null>(null);
	const isPending = create.isPending || update.isPending;
	const isEdit = mode.kind === 'edit';

	useEffect(() => {
		formRef.current?.querySelector<HTMLElement>('input')?.focus();
	}, []);

	function setField<K extends CycleFormField>(field: K, value: CycleFormValues[K]) {
		setValues((v) => ({ ...v, [field]: value }));
		setErrors((e) => ({ ...e, [field]: undefined }));
	}

	function applyServerError(err: unknown) {
		if (!(err instanceof ApiError)) {
			setFormError('Something went wrong. Please try again.');
			return;
		}

		switch (err.code) {
			case 'CYCLE_YEAR_TYPE_TAKEN':
				setErrors({
					year: `${CYCLE_TYPE_LABELS[values.type]} cycle for ${values.year} already exists.`,
				});
				return;
			case 'INVALID_DATE_RANGE':
				setErrors({ endDate: 'The start date must not be after the end date.' });
				return;
			case 'CYCLE_NOT_DRAFT':
				setFormError(
					'Only a draft can be changed, and this cycle is no longer a draft. Close this form to see its current state.',
				);
				return;
			case 'CYCLE_NOT_FOUND':
				setFormError('This cycle no longer exists. Close this form and refresh the list.');
				return;
			case 'VALIDATION_ERROR': {
				const fromServer: CycleFormErrors = {};
				let general: string | null = null;
				for (const fe of err.fieldErrors) {
					const field = FORM_FIELDS.find((f) => f === fe.field);
					if (field) {
						if (!fromServer[field]) fromServer[field] = fe.message;
					} else if (!general) {
						general = fe.message;
					}
				}
				setErrors(fromServer);
				setFormError(general ?? (Object.keys(fromServer).length === 0 ? err.message : null));
				return;
			}
			default:
				setFormError(err.message);
		}
	}

	async function submit() {
		const input = toCycleInput(values);

		try {
			if (mode.kind === 'edit') {
				const data = changedFields(mode.cycle, input);
				if (Object.keys(data).length === 0) {
					onClose();
					return;
				}
				await update.mutateAsync({ id: mode.cycle.id, data });
			} else {
				await create.mutateAsync(input);
			}
			onClose();
		} catch (err) {
			applyServerError(err);
		}
	}

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setFormError(null);

		const clientErrors = validateCycleForm(values);
		setErrors(clientErrors);
		if (Object.keys(clientErrors).length > 0) return;

		const warning = cycleYearWarning(values);
		if (warning) {
			const input = toCycleInput(values);
			const datesTouched =
				mode.kind === 'create' ||
				input.year !== mode.cycle.year ||
				input.startDate !== mode.cycle.startDate ||
				input.endDate !== mode.cycle.endDate;
			if (datesTouched) {
				setYearWarning(warning);
				return;
			}
		}

		void submit();
	}

	return (
		<>
			<Modal title={isEdit ? 'Edit cycle' : 'New cycle'} onClose={onClose}>
				<form ref={formRef} className="form" onSubmit={handleSubmit} noValidate>
					<TextField
						label="Name"
						value={values.name}
						onChange={(e) => setField('name', e.target.value)}
						error={errors.name}
						autoComplete="off"
					/>

					<SelectField
						label="Type"
						value={values.type}
						onChange={(e) => {
							const type = CYCLE_TYPES.find((t) => t === e.target.value);
							if (type) setField('type', type);
						}}
						error={errors.type}
					>
						{CYCLE_TYPES.map((type) => (
							<option key={type} value={type}>
								{CYCLE_TYPE_LABELS[type]}
							</option>
						))}
					</SelectField>

					<TextField
						label="Year"
						inputMode="numeric"
						maxLength={4}
						value={values.year}
						onChange={(e) => setField('year', e.target.value)}
						error={errors.year}
						autoComplete="off"
					/>

					<TextField
						label="Start date"
						type="date"
						value={values.startDate}
						onChange={(e) => setField('startDate', e.target.value)}
						error={errors.startDate}
					/>

					<TextField
						label="End date"
						type="date"
						value={values.endDate}
						onChange={(e) => setField('endDate', e.target.value)}
						error={errors.endDate}
					/>

					{formError ? <Alert>{formError}</Alert> : null}

					<div className="form__actions">
						<button type="button" className="button" onClick={onClose}>
							Cancel
						</button>
						<button type="submit" className="button button--primary" disabled={isPending}>
							{isPending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
						</button>
					</div>
				</form>
			</Modal>

			{yearWarning !== null && (
				<ConfirmDialog
					title="Check the year"
					confirmLabel={isEdit ? 'Save anyway' : 'Create anyway'}
					busyLabel="Saving…"
					isPending={false}
					onConfirm={() => {
						setYearWarning(null);
						void submit();
					}}
					onClose={() => setYearWarning(null)}
				>
					{yearWarning}
				</ConfirmDialog>
			)}
		</>
	);
}
