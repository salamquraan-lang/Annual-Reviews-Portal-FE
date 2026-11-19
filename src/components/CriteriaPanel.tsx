import { useState } from 'react';
import { useCriteria, useDeleteCriterion } from '../hooks/useQuestionBank';
import type { Criterion } from '../types/questionBank';
import { errorMessage } from '../utils/questionBank';
import { ConfirmDialog } from './ConfirmDialog';
import { CriterionFormModal } from './CriterionFormModal';

interface CriteriaPanelProps {
	creating: boolean;
	onCloseCreate: () => void;
	/** Opens the question list filtered to one criterion. */
	onShowQuestions: (criterionId: number) => void;
}

export function CriteriaPanel({ creating, onCloseCreate, onShowQuestions }: CriteriaPanelProps) {
	const criteria = useCriteria();
	const remove = useDeleteCriterion();
	const [editing, setEditing] = useState<Criterion | null>(null);
	const [deleting, setDeleting] = useState<Criterion | null>(null);

	const rows = criteria.data ?? [];

	function closeDelete() {
		remove.reset();
		setDeleting(null);
	}

	return (
		<>
			{criteria.isPending && <p className="state-message">Loading criteria…</p>}
			{criteria.isError && (
				<p className="state-message state-message--error">{errorMessage(criteria.error, 'Could not load criteria.')}</p>
			)}

			{criteria.data && (
				<>
					<p className="toolbar__count">
						{rows.length} {rows.length === 1 ? 'criterion' : 'criteria'}
					</p>
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Description</th>
									<th>Questions</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{rows.length === 0 ? (
									<tr>
										<td colSpan={4} className="table__empty">
											<p>No criteria yet. Create the first one with New criterion.</p>
										</td>
									</tr>
								) : (
									rows.map((criterion) => (
										<tr key={criterion.id}>
											<td className="table__strong">{criterion.name}</td>
											<td className="table__wrap">{criterion.description ?? <span className="muted">—</span>}</td>
											<td>
												{criterion.questionCount > 0 ? (
													<button
														type="button"
														className="link-button"
														onClick={() => onShowQuestions(criterion.id)}
													>
														{criterion.questionCount}
													</button>
												) : (
													0
												)}
											</td>
											<td>
												<div className="table__actions">
													<button type="button" className="button" onClick={() => setEditing(criterion)}>
														Edit
													</button>
													<button
														type="button"
														className="button"
														disabled={criterion.questionCount > 0}
														title={
															criterion.questionCount > 0
																? 'Delete or move its questions first.'
																: undefined
														}
														onClick={() => setDeleting(criterion)}
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
				</>
			)}

			{creating && <CriterionFormModal onClose={onCloseCreate} />}
			{editing && <CriterionFormModal criterion={editing} onClose={() => setEditing(null)} />}
			{deleting && (
				<ConfirmDialog
					title="Delete criterion"
					confirmLabel="Delete"
					busyLabel="Deleting…"
					danger
					isPending={remove.isPending}
					error={remove.error ? errorMessage(remove.error) : undefined}
					onConfirm={() => remove.mutate(deleting.id, { onSuccess: closeDelete })}
					onClose={closeDelete}
				>
					Delete <strong>{deleting.name}</strong>? This cannot be undone.
				</ConfirmDialog>
			)}
		</>
	);
}
