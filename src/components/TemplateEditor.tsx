import { useState } from 'react';
import { templatesApi } from '../api/templates';
import { useTemplateChange } from '../hooks/useTemplates';
import { CYCLE_STATUS_LABELS } from '../types/cycles';
import type { Template, TemplateQuestion } from '../types/templates';
import { KIND_LABELS, REVIEW_TYPE_LABELS, errorMessage } from '../utils/questionBank';
import { moved, questionIds, weightShares } from '../utils/templates';
import { Badge } from './Badge';
import { ConfirmDialog } from './ConfirmDialog';
import { CopyTemplateModal } from './CopyTemplateModal';
import { Alert } from './FormControls';
import { QuestionPickerModal } from './QuestionPickerModal';
import { RenameTemplateModal } from './RenameTemplateModal';
import { WeightInput } from './WeightInput';

type Dialog =
	| { kind: 'add' }
	| { kind: 'copy' }
	| { kind: 'rename' }
	| { kind: 'replace'; question: TemplateQuestion }
	| { kind: 'remove'; question: TemplateQuestion }
	| null;

interface TemplateEditorProps {
	template: Template;
}

/** TPL-2 to TPL-10: one form of one cycle, grouped by criterion. It can change only while the cycle is a draft. */
export function TemplateEditor({ template }: TemplateEditorProps) {
	const id = template.id;
	const [dialog, setDialog] = useState<Dialog>(null);

	const rename = useTemplateChange(id, (name: string) => templatesApi.rename(id, name));
	const add = useTemplateChange(id, (questionId: number) => templatesApi.addQuestion(id, questionId));
	const remove = useTemplateChange(id, (questionId: number) => templatesApi.removeQuestion(id, questionId));
	const replace = useTemplateChange(id, ({ oldId, newId }: { oldId: number; newId: number }) =>
		templatesApi.replaceQuestion(id, oldId, newId),
	);
	const copy = useTemplateChange(id, (sourceId: number) => templatesApi.copyFrom(id, sourceId));
	// Weights and order are changed in place on the page, so their errors are shown above the form.
	const weight = useTemplateChange(id, ({ questionId, value }: { questionId: number; value: number }) =>
		templatesApi.changeWeight(id, questionId, value),
	);
	const orderQuestions = useTemplateChange(id, ({ criterionId, ids }: { criterionId: number; ids: number[] }) =>
		templatesApi.reorderQuestions(id, criterionId, ids),
	);
	const orderSections = useTemplateChange(id, (ids: number[]) => templatesApi.reorderCriteria(id, ids));

	const editable = template.editable;
	const sections = template.sections;
	const taken = questionIds(sections);
	const reordering = orderQuestions.isPending || orderSections.isPending;
	const inlineError = weight.error ?? orderQuestions.error ?? orderSections.error;
	const label = REVIEW_TYPE_LABELS[template.reviewType].toLowerCase();

	function close(mutation: { reset: () => void }) {
		return () => {
			mutation.reset();
			setDialog(null);
		};
	}

	function clearInlineErrors() {
		weight.reset();
		orderQuestions.reset();
		orderSections.reset();
	}

	function moveSection(index: number, direction: -1 | 1) {
		const ids = moved(
			sections.map((section) => section.criterion.id),
			index,
			direction,
		);
		if (!ids) return;
		clearInlineErrors();
		orderSections.mutate(ids);
	}

	function moveQuestion(sectionIndex: number, index: number, direction: -1 | 1) {
		const section = sections[sectionIndex];
		const ids = moved(
			section.questions.map((question) => question.questionId),
			index,
			direction,
		);
		if (!ids) return;
		clearInlineErrors();
		orderQuestions.mutate({ criterionId: section.criterion.id, ids });
	}

	return (
		<section className="template-editor" aria-labelledby="template-name">
			<div className="template-editor__header">
				<div>
					<h2 id="template-name" className="template-editor__title">
						{template.name}
					</h2>
					<p className="muted small">
						{template.questionCount} {template.questionCount === 1 ? 'question' : 'questions'}
						{template.copiedFromId !== null && ' · copied from another cycle'}
					</p>
				</div>
				{editable && (
					<div className="page-header__actions">
						<button type="button" className="button" onClick={() => setDialog({ kind: 'rename' })}>
							Rename
						</button>
						<button type="button" className="button" onClick={() => setDialog({ kind: 'copy' })}>
							Copy from another cycle
						</button>
						<button type="button" className="button button--primary" onClick={() => setDialog({ kind: 'add' })}>
							Add questions
						</button>
					</div>
				)}
			</div>

			{!editable && (
				<Alert kind="info">
					This cycle is {CYCLE_STATUS_LABELS[template.cycleStatus].toLowerCase()}. Its forms can be changed only
					while the cycle is a draft.
				</Alert>
			)}

			{inlineError ? <Alert>{errorMessage(inlineError)}</Alert> : null}

			{sections.length === 0 ? (
				<div className="template-empty">
					<p>The {label} form has no questions yet.</p>
					{editable && <p className="muted">Add questions from the question bank, or copy the form from another cycle.</p>}
				</div>
			) : (
				sections.map((section, sectionIndex) => {
					const shares = weightShares(section);
					return (
						<section key={section.criterion.id} className="template-section" aria-label={section.criterion.name}>
							<div className="template-section__header">
								<h3 className="template-section__title">{section.criterion.name}</h3>
								{editable && sections.length > 1 && (
									<div className="template-section__move">
										<button
											type="button"
											className="icon-button"
											aria-label={`Move ${section.criterion.name} up`}
											disabled={reordering || sectionIndex === 0}
											onClick={() => moveSection(sectionIndex, -1)}
										>
											↑
										</button>
										<button
											type="button"
											className="icon-button"
											aria-label={`Move ${section.criterion.name} down`}
											disabled={reordering || sectionIndex === sections.length - 1}
											onClick={() => moveSection(sectionIndex, 1)}
										>
											↓
										</button>
									</div>
								)}
							</div>

							<ol className="template-questions">
								{section.questions.map((question, index) => (
									<li key={question.questionId} className="template-question">
										<span className="template-question__number">{question.position}.</span>
										<div className="template-question__body">
											<span className="template-question__text">{question.text}</span>
											<span className="template-question__meta">
												<Badge tone={question.kind === 'rating' ? 'info' : 'neutral'}>
													{KIND_LABELS[question.kind]}
												</Badge>
												{question.archived && <Badge tone="neutral">Archived</Badge>}
											</span>
										</div>

										<div className="template-question__weight">
											{question.weight === null ? (
												<span className="muted small">Not scored</span>
											) : (
												<>
													<label className="small muted">Weight</label>
													{editable ? (
														<WeightInput
															value={question.weight}
															label={`Weight of “${question.text}”`}
															disabled={weight.isPending}
															onSave={(value) => {
																clearInlineErrors();
																weight.mutate({ questionId: question.questionId, value });
															}}
														/>
													) : (
														<strong>{question.weight}</strong>
													)}
													<span className="small muted" title="Share of this criterion's score">
														{shares.get(question.questionId) ?? 0}%
													</span>
												</>
											)}
										</div>

										{editable && (
											<div className="template-question__actions">
												<button
													type="button"
													className="icon-button"
													aria-label={`Move “${question.text}” up`}
													disabled={reordering || index === 0}
													onClick={() => moveQuestion(sectionIndex, index, -1)}
												>
													↑
												</button>
												<button
													type="button"
													className="icon-button"
													aria-label={`Move “${question.text}” down`}
													disabled={reordering || index === section.questions.length - 1}
													onClick={() => moveQuestion(sectionIndex, index, 1)}
												>
													↓
												</button>
												<button
													type="button"
													className="button"
													onClick={() => setDialog({ kind: 'replace', question })}
												>
													Replace
												</button>
												<button
													type="button"
													className="button"
													onClick={() => setDialog({ kind: 'remove', question })}
												>
													Remove
												</button>
											</div>
										)}
									</li>
								))}
							</ol>
						</section>
					);
				})
			)}

			{dialog?.kind === 'add' && (
				<QuestionPickerModal
					title={`Add questions to the ${label} form`}
					intro="Each question joins the section of its criterion. Rating questions start with weight 1."
					takenIds={taken}
					pickLabel="Add"
					isPending={add.isPending}
					error={add.error}
					onPick={(questionId) => add.mutate(questionId)}
					onClose={close(add)}
				/>
			)}
			{dialog?.kind === 'replace' && (
				<QuestionPickerModal
					title="Replace question"
					intro={`Pick the question that takes the place and weight of “${dialog.question.text}”. Only ${KIND_LABELS[dialog.question.kind].toLowerCase()} questions are listed, the same kind as the one it replaces.`}
					takenIds={taken}
					kind={dialog.question.kind}
					pickLabel="Use this one"
					closeLabel="Cancel"
					isPending={replace.isPending}
					error={replace.error}
					onPick={(newId) =>
						replace.mutate({ oldId: dialog.question.questionId, newId }, { onSuccess: close(replace) })
					}
					onClose={close(replace)}
				/>
			)}
			{dialog?.kind === 'remove' && (
				<ConfirmDialog
					title="Remove question"
					confirmLabel="Remove"
					busyLabel="Removing…"
					danger
					isPending={remove.isPending}
					error={remove.error ? errorMessage(remove.error) : undefined}
					onConfirm={() => remove.mutate(dialog.question.questionId, { onSuccess: close(remove) })}
					onClose={close(remove)}
				>
					Remove “{dialog.question.text}” from this form? It stays in the question bank.
				</ConfirmDialog>
			)}
			{dialog?.kind === 'copy' && (
				<CopyTemplateModal
					cycleId={template.cycleId}
					reviewType={template.reviewType}
					hasQuestions={template.questionCount > 0}
					isPending={copy.isPending}
					error={copy.error}
					onCopy={(sourceId) => copy.mutate(sourceId, { onSuccess: close(copy) })}
					onClose={close(copy)}
				/>
			)}
			{dialog?.kind === 'rename' && (
				<RenameTemplateModal
					name={template.name}
					isPending={rename.isPending}
					error={rename.error}
					onSave={(name) => rename.mutate(name, { onSuccess: close(rename) })}
					onClose={close(rename)}
				/>
			)}
		</section>
	);
}
