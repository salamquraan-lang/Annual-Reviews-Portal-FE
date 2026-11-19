import { ApiError } from '../api/client';
import { useCycleReadiness } from '../hooks/useCycles';
import { Alert } from './FormControls';

interface ReadinessPanelProps {
	cycleId: number;
}

export function ReadinessPanel({ cycleId }: ReadinessPanelProps) {
	const { data, isPending, isError, error, isFetching, refetch } = useCycleReadiness(
		cycleId,
		true,
	);

	if (isError && error instanceof ApiError && error.code === 'CYCLE_INVALID_STATUS') return null;

	return (
		<section className="card readiness-card" aria-labelledby="readiness-heading">
			<h2 id="readiness-heading">Readiness</h2>

			{isPending && <p className="muted">Checking readiness…</p>}

			{isError && (
				<Alert>{error instanceof ApiError ? error.message : 'Could not check readiness.'}</Alert>
			)}

			{data &&
				!isError &&
				(data.ready ? (
					<Alert kind="success">No problems found. This cycle can be opened.</Alert>
				) : (
					<Alert>
						This cycle is not ready to open.
						{data.problems.length > 0 && (
							<ul>
								{data.problems.map((problem, index) => (
									<li key={index}>{problem.message}</li>
								))}
							</ul>
						)}
					</Alert>
				))}

			<button type="button" className="button" onClick={() => refetch()} disabled={isFetching}>
				{isFetching ? 'Checking…' : 'Check again'}
			</button>
		</section>
	);
}
