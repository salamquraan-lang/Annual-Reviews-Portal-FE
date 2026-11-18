import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCurrentCycle } from '../hooks/useCycles';
import { CYCLE_TYPE_LABELS } from '../types/cycles';
import { formatDate } from '../utils/cycles';
import { Alert } from './FormControls';

export function OpenCycleBanner() {
	const { user } = useAuth();
	const { data: cycle } = useCurrentCycle();

	if (!cycle) return null;

	return (
		<Alert kind="info">
			Open review cycle: <strong>{cycle.name}</strong> ({CYCLE_TYPE_LABELS[cycle.type]} {cycle.year}),
			ends {formatDate(cycle.endDate)}.
			{user?.role === 'admin' && (
				<>
					{' '}
					<Link to={`/cycles/${cycle.id}`}>View cycle</Link>
				</>
			)}
		</Alert>
	);
}
