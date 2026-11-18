import { useState } from 'react';
import { CriteriaPanel } from '../components/CriteriaPanel';
import { QuestionsPanel } from '../components/QuestionsPanel';

type Tab = 'questions' | 'criteria';

/** QB-1 to QB-13: the criteria and questions that templates are built from. Admins only. */
export function QuestionBankPage() {
	const [tab, setTab] = useState<Tab>('questions');
	const [creating, setCreating] = useState(false);
	// Kept here so "show the questions of this criterion" can switch tabs and filter at once.
	const [criterionId, setCriterionId] = useState<number | ''>('');

	function switchTab(next: Tab) {
		setCreating(false);
		setTab(next);
	}

	function showQuestionsOf(id: number) {
		setCriterionId(id);
		switchTab('questions');
	}

	return (
		<>
			<div className="page-header">
				<h1>Question bank</h1>
				<div className="page-header__actions">
					<div className="view-switch" role="group" aria-label="View">
						<button
							type="button"
							className={`view-switch__button${tab === 'questions' ? ' view-switch__button--active' : ''}`}
							aria-pressed={tab === 'questions'}
							onClick={() => switchTab('questions')}
						>
							Questions
						</button>
						<button
							type="button"
							className={`view-switch__button${tab === 'criteria' ? ' view-switch__button--active' : ''}`}
							aria-pressed={tab === 'criteria'}
							onClick={() => switchTab('criteria')}
						>
							Criteria
						</button>
					</div>
					<button type="button" className="button button--primary" onClick={() => setCreating(true)}>
						{tab === 'questions' ? 'New question' : 'New criterion'}
					</button>
				</div>
			</div>

			<p className="page-intro muted">
				Questions are grouped by criterion. Templates for each cycle are built from these questions.
			</p>

			{tab === 'questions' ? (
				<QuestionsPanel
					criterionId={criterionId}
					onCriterionChange={setCriterionId}
					creating={creating}
					onCloseCreate={() => setCreating(false)}
				/>
			) : (
				<CriteriaPanel
					creating={creating}
					onCloseCreate={() => setCreating(false)}
					onShowQuestions={showQuestionsOf}
				/>
			)}
		</>
	);
}
