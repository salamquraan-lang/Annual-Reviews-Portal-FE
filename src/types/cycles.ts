export type CycleType = 'annual' | 'midyear';
export type CycleStatus = 'draft' | 'open' | 'closed' | 'finalized';

export interface Cycle {
	id: number;
	name: string;
	type: CycleType;
	year: number;
	startDate: string;
	endDate: string;
	status: CycleStatus;
}

export interface CycleInput {
	name: string;
	type: CycleType;
	year: number;
	startDate: string;
	endDate: string;
}

export type CycleUpdate = Partial<CycleInput>;

export interface CycleListParams {
	status?: CycleStatus;
	year?: number;
	type?: CycleType;
	page?: number;
	pageSize?: number;
}

export interface ReadinessProblem {
	code: string;
	message: string;
}

export interface Readiness {
	ready: boolean;
	problems: ReadinessProblem[];
}

export interface FinalizeWarning {
	code: string;
	userId: number;
	message: string;
}

export interface FinalizedCycle extends Cycle {
	warnings: FinalizeWarning[];
}

export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
	draft: 'Draft',
	open: 'Open',
	closed: 'Closed',
	finalized: 'Finalized',
};

export const CYCLE_TYPE_LABELS: Record<CycleType, string> = {
	annual: 'Annual',
	midyear: 'Midyear',
};

export const CYCLE_STATUSES: CycleStatus[] = ['draft', 'open', 'closed', 'finalized'];

export const CYCLE_TYPES: CycleType[] = ['annual', 'midyear'];

export type CycleAction =
	| 'edit'
	| 'delete'
	| 'readiness'
	| 'open'
	| 'changeEndDate'
	| 'close'
	| 'reopen'
	| 'finalize'
	| 'copy';
