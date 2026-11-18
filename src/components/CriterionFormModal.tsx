import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useFocusOnOpen } from '../hooks/useFocusOnOpen';
import { useCreateCriterion, useUpdateCriterion } from '../hooks/useQuestionBank';
import type { Criterion, CriterionUpdate } from '../types/questionBank';
import { errorMessage, fieldErrors } from '../utils/questionBank';
import { Modal } from './Modal';

const NAME_MAX = 120;
const DESCRIPTION_MAX = 500;

interface CriterionFormModalProps {
	/** The criterion to edit. Without it, the form creates a new one. */
	criterion?: Criterion;
	onClose: () => void;
}

export function CriterionFormModal({ criterion, onClose }: CriterionFormModalProps) {
	const create = useCreateCriterion();
	const update = useUpdateCriterion();
	const [name, setName] = useState(criterion?.name ?? '');
	const [description, setDescription] = useState(criterion?.description ?? '');
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const busy = create.isPending || update.isPending;
	const nameRef = useFocusOnOpen<HTMLInputElement>();

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setErrors({});
		setFormError(null);

		const trimmedName = name.trim();
		const trimmedDescription = description.trim();
		if (!trimmedName) {
			setErrors({ name: 'Enter a name.' });
			return;
		}

		try {
			if (!criterion) {
				await create.mutateAsync({ name: trimmedName, description: trimmedDescription || null });
			} else {
				const data: CriterionUpdate = {};
				if (trimmedName !== criterion.name) data.name = trimmedName;
				if (trimmedDescription !== (criterion.description ?? '')) data.description = trimmedDescription || null;
				if (Object.keys(data).length > 0) await update.mutateAsync({ id: criterion.id, data });
			}
			onClose();
		} catch (err) {
			if (err instanceof ApiError && err.code === 'CRITERION_NAME_TAKEN') {
				setErrors({ name: err.message });
				return;
			}
			const byField = fieldErrors(err);
			if (Object.keys(byField).length > 0) {
				setErrors(byField);
				return;
			}
			setFormError(errorMessage(err));
		}
	}

	return (
		<Modal title={criterion ? 'Edit criterion' : 'New criterion'} onClose={onClose}>
			<form className="form" onSubmit={handleSubmit} noValidate>
				<div className={`field${errors.name ? ' field--error' : ''}`}>
					<label htmlFor="criterion-name">Name</label>
					<input
						id="criterion-name"
						type="text"
						value={name}
						maxLength={NAME_MAX}
						onChange={(e) => setName(e.target.value)}
						ref={nameRef}
					/>
					{errors.name && <p className="field__error">{errors.name}</p>}
				</div>

				<div className={`field${errors.description ? ' field--error' : ''}`}>
					<label htmlFor="criterion-description">Description (optional)</label>
					<textarea
						id="criterion-description"
						rows={3}
						value={description}
						maxLength={DESCRIPTION_MAX}
						onChange={(e) => setDescription(e.target.value)}
					/>
					{errors.description ? (
						<p className="field__error">{errors.description}</p>
					) : (
						<p className="field__hint">
							{description.length} / {DESCRIPTION_MAX}
						</p>
					)}
				</div>

				{formError && <p className="form__error">{formError}</p>}

				<div className="form__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" disabled={busy}>
						{busy ? 'Saving…' : criterion ? 'Save' : 'Create'}
					</button>
				</div>
			</form>
		</Modal>
	);
}
