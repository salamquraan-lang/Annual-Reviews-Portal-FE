import { CYCLE_STATUS_LABELS } from '../types/cycles';
import type { CycleStatus } from '../types/cycles';
import { Badge } from './Badge';
import type { BadgeTone } from './Badge';

const STATUS_TONES: Record<CycleStatus, BadgeTone> = {
	draft: 'neutral',
	open: 'success',
	closed: 'warning',
	finalized: 'info',
};

interface CycleStatusBadgeProps {
	status: CycleStatus;
}

export function CycleStatusBadge({ status }: CycleStatusBadgeProps) {
	return <Badge tone={STATUS_TONES[status]}>{CYCLE_STATUS_LABELS[status]}</Badge>;
}
