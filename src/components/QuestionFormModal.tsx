import { useState } from 'react';
import type { FormEvent } from 'react';
import { useFocusOnOpen } from '../hooks/useFocusOnOpen';
import { useCopyQuestion, useCreateQuestion, useQuestion, useUpdateQuestion } from '../hooks/useQuestionBank';
import type { Criterion, Question, QuestionKind, QuestionUpdate } from '../types/questionBank';
import { KIND_LABELS, REVIEW_TYPE_LABELS, errorMessage, fieldErrors } from '../utils/questionBank';
import { CYCLE_STATUS_LABELS } from '../types/cycles';
import { Alert } from './FormControls';
import { Modal } from './Modal';

const TEXT_MAX = 500;

export type QuestionFormMode = 'create' | 'edit' | 'copy';

interface QuestionFormModalProps {
	mode: QuestionFormMode;
	/** The question to edit or copy. Not used when creating. */
	question?: Question;
	criteria: Criterion[];
	/** The criterion picked first when creating. */
	defaultCriterionId?: number;
	onClose: () => void;
}

const TITLES: Record<QuestionFormMode, string> = {
	create: 'New question',
	edit: 'Edit question',
	copy: 'Copy question',
};

export function QuestionFormModal({ mode: initialMode, question, criteria, defaultCriterionId, onClose }: QuestionFormModalProps) {
	const [mode, setMode] = useState(initialMode);
	const create = useCreateQuestion();
	const update = useUpdateQuestion();
	const copy = useCopyQuestion();
	// The details say whether the question is locked and where it is used.
	const detail = useQuestion(mode === 'create' || !question ? null : question.id);

	const [criterionId, setCriterionId] = useState<number | ''>(
		question?.criterion.id ?? defaultCriterionId ?? criteria[0]?.id ?? '',
	);
	const [kind, setKind] = useState<QuestionKind>(question?.kind ?? 'rating');
	const [text, setText] = useState(question?.text ?? '');
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [formError, setFormError] = useState<string | null>(null);

	const locked = mode === 'edit' && detail.data?.locked === true;
	const busy = create.isPending || update.isPending || copy.isPending;
	const usage = detail.data?.usage ?? [];
	const textRef = useFocusOnOpen<HTMLTextAreaElement>();

	function changedFields(): QuestionUpdate {
		const data: QuestionUpdate = {};
		const trimmed = text.trim();
		if (!question || criterionId !== question.criterion.id) data.criterionId = Number(criterionId);
		if (!question || kind !== question.kind) data.kind = kind;
		if (!question || trimmed !== question.text) data.text = trimmed;
		return data;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setErrors({});
		setFormError(null);

		const found: Record<string, string> = {};
		if (criterionId === '') found.criterionId = 'Choose a criterion.';
		if (!text.trim()) found.text = 'Enter the question text.';
		if (Object.keys(found).length > 0) {
			setErrors(found);
			return;
		}

		try {
			if (mode === 'create') {
				await create.mutateAsync({ criterionId: Number(criterionId), kind, text: text.trim() });
			} else if (question && mode === 'copy') {
				await copy.mutateAsync({ id: question.id, data: changedFields() });
			} else if (question) {
				const data = changedFields();
				if (Object.keys(data).length > 0) await update.mutateAsync({ id: question.id, data });
			}
			onClose();
		} catch (err) {
			const byField = fieldErrors(err);
			if (Object.keys(byField).length > 0) {
				setErrors(byField);
				return;
			}
			setFormError(errorMessage(err));
		}
	}

	return (
		<Modal title={TITLES[mode]} onClose={onClose}>
			<form className="form" onSubmit={handleSubmit} noValidate>
				{mode === 'copy' && (
					<p className="field__hint">The copy is a new question. Change what you need before saving it.</p>
				)}

				{locked && (
					<Alert kind="info">
						A cycle that was opened uses this question, so it cannot be changed.{' '}
						<button type="button" className="link-button" onClick={() => setMode('copy')}>
							Make a copy
						</button>{' '}
						and change the copy instead.
					</Alert>
				)}

				<div className={`field${errors.criterionId ? ' field--error' : ''}`}>
					<label htmlFor="question-criterion">Criterion</label>
					<select
						id="question-criterion"
						value={criterionId}
						disabled={locked}
						onChange={(e) => setCriterionId(e.target.value === '' ? '' : Number(e.target.value))}
					>
						{criteria.length === 0 && <option value="">Create a criterion first</option>}
						{criteria.map((criterion) => (
							<option key={criterion.id} value={criterion.id}>
								{criterion.name}
							</option>
						))}
					</select>
					{errors.criterionId && <p className="field__error">{errors.criterionId}</p>}
				</div>

				<div className={`field${errors.kind ? ' field--error' : ''}`}>
					<label htmlFor="question-kind">Answer type</label>
					<select
						id="question-kind"
						value={kind}
						disabled={locked}
						onChange={(e) => setKind(e.target.value as QuestionKind)}
					>
						<option value="rating">{KIND_LABELS.rating} (1 to 5, counts in the score)</option>
						<option value="text">{KIND_LABELS.text} (not scored)</option>
					</select>
					{errors.kind && <p className="field__error">{errors.kind}</p>}
				</div>

				<div className={`field${errors.text ? ' field--error' : ''}`}>
					<label htmlFor="question-text">Question</label>
					<textarea
						id="question-text"
						rows={3}
						value={text}
						maxLength={TEXT_MAX}
						disabled={locked}
						onChange={(e) => setText(e.target.value)}
						ref={textRef}
					/>
					{errors.text ? (
						<p className="field__error">{errors.text}</p>
					) : (
						<p className="field__hint">
							{text.length} / {TEXT_MAX}
						</p>
					)}
				</div>

				{mode === 'edit' && (
					<div className="usage">
						<h3 className="usage__title">Used in</h3>
						{detail.isPending && <p className="field__hint">Loading…</p>}
						{detail.isError && <p className="form__error">{errorMessage(detail.error)}</p>}
						{detail.data && usage.length === 0 && (
							<p className="field__hint">No template uses this question yet.</p>
						)}
						{usage.length > 0 && (
							<ul className="usage__list">
								{usage.map((item) => (
									<li key={item.templateId}>
										{item.cycle.name} · {REVIEW_TYPE_LABELS[item.reviewType]}{' '}
										<span className="muted">({CYCLE_STATUS_LABELS[item.cycle.status]})</span>
									</li>
								))}
							</ul>
						)}
						{detail.data && !locked && usage.length > 0 && (
							<p className="field__hint">Changes also apply to the draft templates listed here.</p>
						)}
					</div>
				)}

				{formError && <p className="form__error">{formError}</p>}

				<div className="form__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					{!locked && (
						<button type="submit" className="button button--primary" disabled={busy || criteria.length === 0}>
							{busy ? 'Saving…' : mode === 'edit' ? 'Save' : mode === 'copy' ? 'Create copy' : 'Create'}
						</button>
					)}
				</div>
			</form>
		</Modal>
	);
}
