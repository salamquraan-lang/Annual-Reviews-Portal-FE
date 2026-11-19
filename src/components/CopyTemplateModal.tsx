import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCycles } from '../hooks/useCycles';
import { useCycleTemplates } from '../hooks/useTemplates';
import { CYCLE_STATUS_LABELS } from '../types/cycles';
import type { ReviewType } from '../types/questionBank';
import { REVIEW_TYPE_LABELS, errorMessage } from '../utils/questionBank';
import { Alert } from './FormControls';
import { Modal } from './Modal';
import { SelectField } from './SelectField';

interface CopyTemplateModalProps {
	cycleId: number;
	reviewType: ReviewType;
	/** True when the form already has questions, which the copy replaces. */
	hasQuestions: boolean;
	isPending: boolean;
	error: unknown;
	onCopy: (sourceTemplateId: number) => void;
	onClose: () => void;
}

/** TPL-10: replace this form with the same form of another cycle. */
export function CopyTemplateModal({
	cycleId,
	reviewType,
	hasQuestions,
	isPending,
	error,
	onCopy,
	onClose,
}: CopyTemplateModalProps) {
	const cycles = useCycles({ pageSize: 100 });
	const [sourceCycleId, setSourceCycleId] = useState<number | ''>('');
	const sourceTemplates = useCycleTemplates(sourceCycleId === '' ? null : sourceCycleId);
	const source = sourceTemplates.data?.find((template) => template.reviewType === reviewType);
	const [formError, setFormError] = useState<string | null>(null);

	const otherCycles = (cycles.data?.items ?? []).filter((cycle) => cycle.id !== cycleId);
	const label = REVIEW_TYPE_LABELS[reviewType].toLowerCase();

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setFormError(null);
		if (sourceCycleId === '') {
			setFormError('Choose a cycle to copy from.');
			return;
		}
		if (!source) {
			setFormError(`That cycle has no ${label} form.`);
			return;
		}
		onCopy(source.id);
	}

	return (
		<Modal title={`Copy the ${label} form`} onClose={onClose}>
			<form className="form" onSubmit={handleSubmit} noValidate>
				<p className="field__hint">
					The questions, their order and their weights are copied from the {label} form of the cycle you choose.
				</p>

				{cycles.isError && <Alert>{errorMessage(cycles.error, 'Could not load the cycles.')}</Alert>}

				<SelectField
					label="Copy from"
					value={sourceCycleId}
					disabled={cycles.isPending}
					onChange={(e) => setSourceCycleId(e.target.value === '' ? '' : Number(e.target.value))}
					hint={
						source
							? `${source.questionCount} ${source.questionCount === 1 ? 'question' : 'questions'} in its ${label} form.`
							: undefined
					}
				>
					<option value="">{cycles.isPending ? 'Loading cycles…' : 'Choose a cycle'}</option>
					{otherCycles.map((cycle) => (
						<option key={cycle.id} value={cycle.id}>
							{cycle.name} ({CYCLE_STATUS_LABELS[cycle.status]})
						</option>
					))}
				</SelectField>

				{cycles.data && otherCycles.length === 0 && (
					<p className="field__hint">There is no other cycle to copy from yet.</p>
				)}

				{hasQuestions && (
					<Alert kind="info">This replaces every question that is in this form now.</Alert>
				)}

				{formError && <p className="form__error">{formError}</p>}
				{error ? <Alert>{errorMessage(error)}</Alert> : null}

				<div className="form__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button
						type="submit"
						className="button button--primary"
						disabled={isPending || sourceCycleId === '' || sourceTemplates.isPending}
					>
						{isPending ? 'Copying…' : 'Copy'}
					</button>
				</div>
			</form>
		</Modal>
	);
}
