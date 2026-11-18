import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useDeleteCycle } from '../hooks/useCycleMutations';
import type { Cycle } from '../types/cycles';
import { ConfirmDialog } from './ConfirmDialog';

function errorFor(err: unknown): ReactNode {
	if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.';

	switch (err.code) {
		case 'CYCLE_NOT_DRAFT':
			return 'Only a draft can be deleted, and this cycle is no longer a draft. The page was refreshed.';
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

interface CycleDangerZoneProps {
	cycle: Cycle;
}

export function CycleDangerZone({ cycle }: CycleDangerZoneProps) {
	const navigate = useNavigate();
	const deleteCycle = useDeleteCycle();
	const [confirming, setConfirming] = useState(false);
	const [error, setError] = useState<ReactNode>(null);

	function cancel() {
		setConfirming(false);
		setError(null);
	}

	async function confirm() {
		setError(null);
		try {
			await deleteCycle.mutateAsync(cycle.id);
			navigate('/cycles', { replace: true });
		} catch (err) {
			setError(errorFor(err));
		}
	}

	return (
		<>
			<section className="card danger-card" aria-labelledby="danger-heading">
				<h2 id="danger-heading">Danger zone</h2>
				<p className="muted">Deleting a draft removes it for good.</p>
				<button type="button" className="button button--danger" onClick={() => setConfirming(true)}>
					Delete cycle
				</button>
			</section>

			{confirming && (
				<ConfirmDialog
					title="Delete this cycle?"
					confirmLabel="Delete cycle"
					busyLabel="Deleting…"
					isPending={deleteCycle.isPending}
					error={error}
					confirmText={cycle.name}
					danger
					onConfirm={confirm}
					onClose={cancel}
				>
					This deletes the draft and its templates. This cannot be undone.
				</ConfirmDialog>
			)}
		</>
	);
}
