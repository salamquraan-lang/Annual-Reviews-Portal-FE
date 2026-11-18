import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useChangeCycleEndDate } from '../hooks/useCycleMutations';
import type { Cycle } from '../types/cycles';
import { formatDate, isValidDateText } from '../utils/cycles';
import { Alert, TextField } from './FormControls';
import { Modal } from './Modal';

interface ChangeEndDateModalProps {
	cycle: Cycle;
	onClose: () => void;
}

export function ChangeEndDateModal({ cycle, onClose }: ChangeEndDateModalProps) {
	const changeEndDate = useChangeCycleEndDate();
	const formRef = useRef<HTMLFormElement>(null);
	const [endDate, setEndDate] = useState(cycle.endDate);
	const [fieldError, setFieldError] = useState<string | undefined>();
	const [formError, setFormError] = useState<string | null>(null);

	useEffect(() => {
		formRef.current?.querySelector<HTMLElement>('input')?.focus();
	}, []);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setFieldError(undefined);
		setFormError(null);

		if (!endDate) {
			setFieldError('Choose an end date.');
			return;
		}
		if (!isValidDateText(endDate)) {
			setFieldError('Enter a valid end date.');
			return;
		}
		if (endDate < cycle.startDate) {
			setFieldError('The end date must not be before the start date.');
			return;
		}
		if (endDate === cycle.endDate) {
			onClose();
			return;
		}

		try {
			await changeEndDate.mutateAsync({ id: cycle.id, endDate });
			onClose();
		} catch (err) {
			if (err instanceof ApiError) {
				switch (err.code) {
					case 'END_DATE_IN_PAST':
						setFieldError('The end date cannot be in the past.');
						return;
					case 'INVALID_DATE_RANGE':
						setFieldError('The end date must not be before the start date.');
						return;
					case 'CYCLE_INVALID_STATUS':
						setFormError(
							'This cycle is no longer open, so its end date cannot be changed. The page was refreshed.',
						);
						return;
					case 'CYCLE_NOT_FOUND':
						setFormError('This cycle no longer exists. Close this form and refresh the list.');
						return;
					case 'VALIDATION_ERROR': {
						const fieldMessage = err.fieldErrors.find((fe) => fe.field === 'endDate');
						if (fieldMessage) setFieldError(fieldMessage.message);
						else setFormError(err.message);
						return;
					}
					default:
						setFormError(err.message);
						return;
				}
			}
			setFormError('Something went wrong. Please try again.');
		}
	}

	return (
		<Modal title="Change end date" onClose={onClose}>
			<form ref={formRef} className="form" onSubmit={handleSubmit} noValidate>
				<TextField
					label="End date"
					type="date"
					value={endDate}
					onChange={(e) => {
						setEndDate(e.target.value);
						setFieldError(undefined);
					}}
					error={fieldError}
					hint={`The cycle starts on ${formatDate(cycle.startDate)}.`}
				/>

				{formError ? <Alert>{formError}</Alert> : null}

				<div className="form__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" disabled={changeEndDate.isPending}>
						{changeEndDate.isPending ? 'Saving…' : 'Save'}
					</button>
				</div>
			</form>
		</Modal>
	);
}
