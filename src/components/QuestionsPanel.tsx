import { useState } from 'react';
import { useArchiveQuestion, useCriteria, useDeleteQuestion, useQuestions } from '../hooks/useQuestionBank';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { QuestionKind, QuestionListItem } from '../types/questionBank';
import { KIND_LABELS, errorMessage } from '../utils/questionBank';
import { CYCLE_STATUS_LABELS } from '../types/cycles';
import { Badge } from './Badge';
import { ConfirmDialog } from './ConfirmDialog';
import { Pagination } from './Pagination';
import { QuestionFormModal } from './QuestionFormModal';
import type { QuestionFormMode } from './QuestionFormModal';

const PAGE_SIZE = 20;

type UsedFilter = 'all' | 'used' | 'unused';

interface QuestionsPanelProps {
	criterionId: number | '';
	onCriterionChange: (criterionId: number | '') => void;
	creating: boolean;
	onCloseCreate: () => void;
}

export function QuestionsPanel({ criterionId, onCriterionChange, creating, onCloseCreate }: QuestionsPanelProps) {
	const criteria = useCriteria();
	const archive = useArchiveQuestion();
	const remove = useDeleteQuestion();

	const [search, setSearch] = useState('');
	const [kind, setKind] = useState<QuestionKind | ''>('');
	const [used, setUsed] = useState<UsedFilter>('all');
	const [showArchived, setShowArchived] = useState(false);
	const [page, setPage] = useState(1);
	const [form, setForm] = useState<{ mode: QuestionFormMode; question: QuestionListItem } | null>(null);
	const [deleting, setDeleting] = useState<QuestionListItem | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	const debouncedSearch = useDebouncedValue(search.trim());
	const questions = useQuestions({
		criterionId: criterionId === '' ? undefined : criterionId,
		kind: kind || undefined,
		used: used === 'all' ? undefined : used === 'used',
		showArchived: showArchived || undefined,
		search: debouncedSearch || undefined,
		page,
		pageSize: PAGE_SIZE,
	});

	const hasFilters = search.trim() !== '' || criterionId !== '' || kind !== '' || used !== 'all' || showArchived;
	const data = questions.data;

	// Every filter change starts again from the first page.
	function changeFilter<T>(setter: (value: T) => void) {
		return (value: T) => {
			setPage(1);
			setter(value);
		};
	}

	function closeDelete() {
		remove.reset();
		setDeleting(null);
	}

	function clearFilters() {
		setPage(1);
		setSearch('');
		onCriterionChange('');
		setKind('');
		setUsed('all');
		setShowArchived(false);
	}

	async function toggleArchive(question: QuestionListItem) {
		setActionError(null);
		try {
			await archive.mutateAsync({ id: question.id, archive: !question.archived });
		} catch (err) {
			setActionError(errorMessage(err));
		}
	}

	return (
		<>
			<div className="toolbar">
				<input
					type="search"
					className="toolbar__search-input"
					placeholder="Search question text"
					aria-label="Search questions"
					maxLength={100}
					value={search}
					onChange={(e) => changeFilter(setSearch)(e.target.value)}
				/>

				<label className="toolbar__field">
					Criterion
					<select
						value={criterionId}
						onChange={(e) => changeFilter(onCriterionChange)(e.target.value === '' ? '' : Number(e.target.value))}
					>
						<option value="">All</option>
						{(criteria.data ?? []).map((criterion) => (
							<option key={criterion.id} value={criterion.id}>
								{criterion.name}
							</option>
						))}
					</select>
				</label>

				<label className="toolbar__field">
					Type
					<select value={kind} onChange={(e) => changeFilter(setKind)(e.target.value as QuestionKind | '')}>
						<option value="">All</option>
						<option value="rating">{KIND_LABELS.rating}</option>
						<option value="text">{KIND_LABELS.text}</option>
					</select>
				</label>

				<label className="toolbar__field">
					Used
					<select value={used} onChange={(e) => changeFilter(setUsed)(e.target.value as UsedFilter)}>
						<option value="all">All</option>
						<option value="used">Used in a template</option>
						<option value="unused">Never used</option>
					</select>
				</label>

				<label className="checkbox toolbar__field">
					<input
						type="checkbox"
						checked={showArchived}
						onChange={(e) => changeFilter(setShowArchived)(e.target.checked)}
					/>
					Show archived
				</label>
			</div>

			{actionError && <p className="form__error page-error">{actionError}</p>}

			{questions.isPending && <p className="state-message">Loading questions…</p>}
			{questions.isError && (
				<p className="state-message state-message--error">
					{errorMessage(questions.error, 'Could not load questions.')}
				</p>
			)}

			{data && (
				<>
					<p className="toolbar__count">
						{data.total} {data.total === 1 ? 'question' : 'questions'}
						{hasFilters ? (data.total === 1 ? ' matches your filters' : ' match your filters') : ''}
					</p>

					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Question</th>
									<th>Criterion</th>
									<th>Type</th>
									<th>Last used</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{data.items.length === 0 ? (
									<tr>
										<td colSpan={5} className="table__empty">
											<p>
												{hasFilters
													? 'No questions match your filters.'
													: 'No questions yet. Create the first one with New question.'}
											</p>
											{hasFilters && (
												<button type="button" className="button" onClick={clearFilters}>
													Clear filters
												</button>
											)}
										</td>
									</tr>
								) : (
									data.items.map((question) => (
										<tr key={question.id} className={question.archived ? 'table__row--muted' : undefined}>
											<td className="table__wrap">
												{question.text}
												{question.archived && (
													<>
														{' '}
														<Badge tone="neutral">Archived</Badge>
													</>
												)}
											</td>
											<td>{question.criterion.name}</td>
											<td>
												<Badge tone={question.kind === 'rating' ? 'info' : 'neutral'}>{KIND_LABELS[question.kind]}</Badge>
											</td>
											<td>
												{question.lastUsedCycle ? (
													<>
														{question.lastUsedCycle.name}{' '}
														<span className="muted small">({CYCLE_STATUS_LABELS[question.lastUsedCycle.status]})</span>
													</>
												) : (
													<span className="muted">Never</span>
												)}
											</td>
											<td>
												<div className="table__actions table__actions--wrap">
													<button
														type="button"
														className="button"
														onClick={() => setForm({ mode: 'edit', question })}
													>
														Edit
													</button>
													<button
														type="button"
														className="button"
														onClick={() => setForm({ mode: 'copy', question })}
													>
														Copy
													</button>
													<button
														type="button"
														className="button"
														disabled={archive.isPending}
														onClick={() => toggleArchive(question)}
													>
														{question.archived ? 'Unarchive' : 'Archive'}
													</button>
													<button
														type="button"
														className="button"
														disabled={question.used}
														title={question.used ? 'A template uses it. Archive it instead.' : undefined}
														onClick={() => setDeleting(question)}
													>
														Delete
													</button>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{data.total > PAGE_SIZE && (
						<Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
					)}
				</>
			)}

			{creating && (
				<QuestionFormModal
					mode="create"
					criteria={criteria.data ?? []}
					defaultCriterionId={criterionId === '' ? undefined : criterionId}
					onClose={onCloseCreate}
				/>
			)}
			{form && (
				<QuestionFormModal
					mode={form.mode}
					question={form.question}
					criteria={criteria.data ?? []}
					onClose={() => setForm(null)}
				/>
			)}
			{deleting && (
				<ConfirmDialog
					title="Delete question"
					confirmLabel="Delete"
					busyLabel="Deleting…"
					danger
					isPending={remove.isPending}
					error={remove.error ? errorMessage(remove.error) : undefined}
					onConfirm={() => remove.mutate(deleting.id, { onSuccess: closeDelete })}
					onClose={closeDelete}
				>
					Delete “{deleting.text}”? This cannot be undone.
				</ConfirmDialog>
			)}
		</>
	);
}
