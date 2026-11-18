import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import {
	useCloseCycle,
	useFinalizeCycle,
	useOpenCycle,
	useReopenCycle,
} from '../hooks/useCycleMutations';
import { CYCLE_STATUSES, CYCLE_STATUS_LABELS } from '../types/cycles';
import type { Cycle, CycleStatus, FinalizeWarning } from '../types/cycles';
import { allowedActions } from '../utils/cycles';
import { ConfirmDialog } from './ConfirmDialog';
import { FinalizeResultDialog } from './FinalizeResultDialog';

type LifecycleAction = 'open' | 'close' | 'reopen' | 'finalize';

interface ActionCopy {
	title: string;
	label: string;
	busy: string;
	text: string;
	strong: boolean;
}

const LIFECYCLE_ACTIONS: LifecycleAction[] = ['open', 'close', 'reopen', 'finalize'];

const ACTION_COPY: Record<LifecycleAction, ActionCopy> = {
	open: {
		title: 'Open this cycle?',
		label: 'Open cycle',
		busy: 'Opening…',
		text: "Opening takes a snapshot of every active user's department and manager and creates the review assignments. Only one cycle can be open at a time.",
		strong: false,
	},
	close: {
		title: 'Close this cycle?',
		label: 'Close cycle',
		busy: 'Closing…',
		text: 'No more reviews can be submitted. Scores are calculated. You can still reopen the cycle before it is finalized.',
		strong: false,
	},
	reopen: {
		title: 'Reopen this cycle?',
		label: 'Reopen cycle',
		busy: 'Reopening…',
		text: 'Reopening discards the calculated results, including any HR adjustments. They are calculated again at the next close.',
		strong: false,
	},
	finalize: {
		title: 'Finalize this cycle?',
		label: 'Finalize cycle',
		busy: 'Finalizing…',
		text: 'This cannot be undone. Employees will see their results. Reward proposals are created.',
		strong: true,
	},
};

const NEXT_STEP: Record<CycleStatus, string> = {
	draft: 'This cycle is a draft. Check it, then open it to start the review.',
	open: 'This cycle is open. Close it when the review period ends.',
	closed: 'This cycle is closed. Reopen it, or finalize it to publish the results.',
	finalized: 'This cycle is finalized. It can no longer be changed.',
};

function problemList(err: ApiError): ReactNode {
	if (err.fieldErrors.length === 0) return null;
	return (
		<ul>
			{err.fieldErrors.map((problem, index) => (
				<li key={index}>{problem.message}</li>
			))}
		</ul>
	);
}

function errorFor(err: unknown): ReactNode {
	if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.';

	switch (err.code) {
		case 'ANOTHER_CYCLE_OPEN':
			return (
				<>
					Another cycle is already open. Close it first.{' '}
					<Link to="/cycles?status=open">Show the open cycle</Link>
				</>
			);
		case 'CYCLE_NOT_READY':
			return (
				<>
					The cycle is not ready to open.
					{problemList(err)}
				</>
			);
		case 'REWARD_BANDS_INCOMPLETE':
			return (
				<>
					The reward bands have gaps or overlaps.
					{problemList(err)}
				</>
			);
		case 'CYCLE_INVALID_STATUS':
			return "This action no longer fits the cycle's status. The page was refreshed.";
		case 'CYCLE_NOT_FOUND':
			return (
				<>
					This cycle no longer exists. <Link to="/cycles">Back to cycles</Link>
				</>
			);
		default:
			return err.message;
	}
}

interface CycleLifecycleProps {
	cycle: Cycle;
}

export function CycleLifecycle({ cycle }: CycleLifecycleProps) {
	const openCycle = useOpenCycle();
	const closeCycle = useCloseCycle();
	const reopenCycle = useReopenCycle();
	const finalizeCycle = useFinalizeCycle();
	const mutations = {
		open: openCycle,
		close: closeCycle,
		reopen: reopenCycle,
		finalize: finalizeCycle,
	};
	const [active, setActive] = useState<LifecycleAction | null>(null);
	const [error, setError] = useState<ReactNode>(null);
	const [finalWarnings, setFinalWarnings] = useState<FinalizeWarning[] | null>(null);

	const actions = allowedActions(cycle.status);
	const currentIndex = CYCLE_STATUSES.indexOf(cycle.status);

	function start(action: LifecycleAction) {
		setError(null);
		setActive(action);
	}

	function cancel() {
		setActive(null);
		setError(null);
	}

	async function confirm() {
		if (!active) return;
		setError(null);
		try {
			if (active === 'finalize') {
				const result = await finalizeCycle.mutateAsync(cycle.id);
				setFinalWarnings(result.warnings ?? []);
			} else {
				await mutations[active].mutateAsync(cycle.id);
			}
			setActive(null);
		} catch (err) {
			setError(errorFor(err));
		}
	}

	return (
		<>
			<section className="card lifecycle-card" aria-labelledby="lifecycle-heading">
				<h2 id="lifecycle-heading">Lifecycle</h2>

				<ol className="lifecycle">
					{CYCLE_STATUSES.map((status, index) => (
						<li
							key={status}
							className={`lifecycle__step${index < currentIndex ? ' lifecycle__step--done' : ''}${index === currentIndex ? ' lifecycle__step--current' : ''}`}
							aria-current={index === currentIndex ? 'step' : undefined}
						>
							{CYCLE_STATUS_LABELS[status]}
						</li>
					))}
				</ol>

				<p className="muted">{NEXT_STEP[cycle.status]}</p>

				<div className="lifecycle__actions">
					{LIFECYCLE_ACTIONS.filter((action) => actions.includes(action)).map((action) => (
						<button
							key={action}
							type="button"
							className={action === 'reopen' ? 'button' : 'button button--primary'}
							onClick={() => start(action)}
						>
							{ACTION_COPY[action].label}
						</button>
					))}
				</div>
			</section>

			{active && (
				<ConfirmDialog
					title={ACTION_COPY[active].title}
					confirmLabel={ACTION_COPY[active].label}
					busyLabel={ACTION_COPY[active].busy}
					isPending={mutations[active].isPending}
					error={error}
					confirmText={ACTION_COPY[active].strong ? cycle.name : undefined}
					danger={ACTION_COPY[active].strong}
					onConfirm={confirm}
					onClose={cancel}
				>
					{ACTION_COPY[active].text}
				</ConfirmDialog>
			)}

			{finalWarnings !== null && (
				<FinalizeResultDialog warnings={finalWarnings} onClose={() => setFinalWarnings(null)} />
			)}
		</>
	);
}
