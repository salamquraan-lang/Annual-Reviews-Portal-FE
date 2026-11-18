import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { CycleFormModal } from '../components/CycleFormModal';
import { CycleLifecycle } from '../components/CycleLifecycle';
import { CycleStatusBadge } from '../components/CycleStatusBadge';
import { ReadinessPanel } from '../components/ReadinessPanel';
import { useCycle } from '../hooks/useCycles';
import { CYCLE_TYPE_LABELS } from '../types/cycles';
import { allowedActions, formatDate } from '../utils/cycles';

function CycleNotFound() {
	return (
		<div className="card center">
			<h1>Cycle not found</h1>
			<p className="muted">This cycle does not exist, or it was deleted.</p>
			<Link to="/cycles">Back to cycles</Link>
		</div>
	);
}

export function CycleDetailPage() {
	const { id: idParam } = useParams();
	const parsed = Number(idParam);
	const id = /^\d+$/.test(idParam ?? '') && Number.isSafeInteger(parsed) ? parsed : NaN;
	const { data: cycle, isPending, isError, error } = useCycle(id);
	const [editing, setEditing] = useState(false);

	if (!Number.isInteger(id)) return <CycleNotFound />;
	if (isPending) return <p className="state-message">Loading cycle…</p>;
	if (isError) {
		if (error instanceof ApiError && error.code === 'CYCLE_NOT_FOUND') return <CycleNotFound />;
		return (
			<p className="state-message state-message--error">
				{error instanceof ApiError ? error.message : 'Could not load the cycle.'}
			</p>
		);
	}

	const actions = allowedActions(cycle.status);

	return (
		<>
			<p className="small">
				<Link to="/cycles">← Back to cycles</Link>
			</p>

			<div className="page-header">
				<h1>{cycle.name}</h1>
				<div className="page-header__actions">
					<CycleStatusBadge status={cycle.status} />
					{actions.includes('edit') && (
						<button type="button" className="button" onClick={() => setEditing(true)}>
							Edit
						</button>
					)}
				</div>
			</div>

			<CycleLifecycle cycle={cycle} />

			{actions.includes('readiness') && <ReadinessPanel cycleId={cycle.id} />}

			<section className="card" aria-labelledby="cycle-details-heading">
				<h2 id="cycle-details-heading">Details</h2>
				<dl className="details">
					<dt>Name</dt>
					<dd>{cycle.name}</dd>
					<dt>Type</dt>
					<dd>{CYCLE_TYPE_LABELS[cycle.type]}</dd>
					<dt>Year</dt>
					<dd>{cycle.year}</dd>
					<dt>Start date</dt>
					<dd>{formatDate(cycle.startDate)}</dd>
					<dt>End date</dt>
					<dd>{formatDate(cycle.endDate)}</dd>
				</dl>
			</section>

			{editing && (
				<CycleFormModal mode={{ kind: 'edit', cycle }} onClose={() => setEditing(false)} />
			)}
		</>
	);
}
