import { useState } from 'react';
import { useFocusOnOpen } from '../hooks/useFocusOnOpen';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useCriteria, useQuestions } from '../hooks/useQuestionBank';
import type { QuestionKind } from '../types/questionBank';
import { KIND_LABELS, errorMessage } from '../utils/questionBank';
import { Badge } from './Badge';
import { Alert } from './FormControls';
import { Modal } from './Modal';
import { Pagination } from './Pagination';

const PAGE_SIZE = 10;

interface QuestionPickerModalProps {
	title: string;
	/** What the picked question is used for, shown above the list. */
	intro?: string;
	/** Questions already in the template. They are shown, but cannot be picked again. */
	takenIds: Set<number>;
	/** Only questions of this kind can be picked (a replacement must be the same kind). */
	kind?: QuestionKind;
	pickLabel: string;
	/** The button that closes the list. */
	closeLabel?: string;
	isPending: boolean;
	error: unknown;
	onPick: (questionId: number) => void;
	onClose: () => void;
}

/** Search the question bank and pick one question. Archived questions can be picked; using one unarchives it. */
export function QuestionPickerModal({
	title,
	intro,
	takenIds,
	kind,
	pickLabel,
	closeLabel = 'Done',
	isPending,
	error,
	onPick,
	onClose,
}: QuestionPickerModalProps) {
	const criteria = useCriteria();
	const [search, setSearch] = useState('');
	const [criterionId, setCriterionId] = useState<number | ''>('');
	const [page, setPage] = useState(1);
	const [picked, setPicked] = useState<number | null>(null);
	const debouncedSearch = useDebouncedValue(search.trim());
	const searchRef = useFocusOnOpen<HTMLInputElement>();

	const questions = useQuestions({
		search: debouncedSearch || undefined,
		criterionId: criterionId === '' ? undefined : criterionId,
		kind,
		showArchived: true,
		page,
		pageSize: PAGE_SIZE,
	});
	const data = questions.data;

	function pick(questionId: number) {
		setPicked(questionId);
		onPick(questionId);
	}

	return (
		<Modal title={title} onClose={onClose}>
			<div className="form picker-modal">
				{intro && <p className="field__hint">{intro}</p>}

				<div className="toolbar toolbar--compact">
					<input
						type="search"
						className="toolbar__search-input"
						placeholder="Search question text"
						aria-label="Search questions"
						maxLength={100}
						value={search}
						onChange={(e) => {
							setPage(1);
							setSearch(e.target.value);
						}}
						ref={searchRef}
					/>
					<label className="toolbar__field">
						Criterion
						<select
							value={criterionId}
							onChange={(e) => {
								setPage(1);
								setCriterionId(e.target.value === '' ? '' : Number(e.target.value));
							}}
						>
							<option value="">All</option>
							{(criteria.data ?? []).map((criterion) => (
								<option key={criterion.id} value={criterion.id}>
									{criterion.name}
								</option>
							))}
						</select>
					</label>
				</div>

				{error ? <Alert>{errorMessage(error)}</Alert> : null}

				{questions.isPending && <p className="state-message">Loading questions…</p>}
				{questions.isError && (
					<p className="state-message state-message--error">
						{errorMessage(questions.error, 'Could not load questions.')}
					</p>
				)}

				{data && data.items.length === 0 && (
					<p className="state-message">
						{debouncedSearch || criterionId !== ''
							? 'No questions match.'
							: 'The question bank has no questions yet. Add them on the Question bank page.'}
					</p>
				)}

				{data && data.items.length > 0 && (
					<ul className="picker-list" aria-label="Questions">
						{data.items.map((question) => {
							const taken = takenIds.has(question.id);
							return (
								<li key={question.id} className="picker-list__item">
									<div className="picker-list__text">
										<span>{question.text}</span>
										<span className="picker-list__meta">
											{question.criterion.name} · <Badge tone={question.kind === 'rating' ? 'info' : 'neutral'}>{KIND_LABELS[question.kind]}</Badge>
											{question.archived && (
												<>
													{' '}
													<Badge tone="neutral">Archived</Badge>
												</>
											)}
										</span>
									</div>
									{taken ? (
										<span className="muted small">Already in this form</span>
									) : (
										<button
											type="button"
											className="button"
											disabled={isPending}
											onClick={() => pick(question.id)}
										>
											{isPending && picked === question.id ? 'Saving…' : pickLabel}
										</button>
									)}
								</li>
							);
						})}
					</ul>
				)}

				{data && data.total > PAGE_SIZE && (
					<Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
				)}

				<div className="form__actions">
					<button type="button" className="button" onClick={onClose}>
						{closeLabel}
					</button>
				</div>
			</div>
		</Modal>
	);
}
