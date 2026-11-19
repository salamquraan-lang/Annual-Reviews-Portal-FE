import { request } from './client';
import { toQuery } from './query';
import type { Page } from '../types/common';
import type {
	Cycle,
	CycleInput,
	CycleListParams,
	CycleUpdate,
	FinalizedCycle,
	Readiness,
} from '../types/cycles';

export const cyclesApi = {
	list: (params: CycleListParams = {}) =>
		request<Page<Cycle>>('GET', `/cycles${toQuery(params)}`, undefined, { auth: true }),
	current: () => request<Cycle>('GET', '/cycles/current', undefined, { auth: true }),
	get: (id: number) => request<Cycle>('GET', `/cycles/${id}`, undefined, { auth: true }),
	readiness: (id: number) => request<Readiness>('GET', `/cycles/${id}/readiness`, undefined, { auth: true }),
	create: (data: CycleInput) => request<Cycle>('POST', '/cycles', data, { auth: true }),
	copy: (id: number, data: CycleInput) => request<Cycle>('POST', `/cycles/${id}/copy`, data, { auth: true }),
	update: (id: number, data: CycleUpdate) => request<Cycle>('PATCH', `/cycles/${id}`, data, { auth: true }),
	changeEndDate: (id: number, endDate: string) =>
		request<Cycle>('PUT', `/cycles/${id}/end-date`, { endDate }, { auth: true }),
	remove: (id: number) => request<void>('DELETE', `/cycles/${id}`, undefined, { auth: true }),
	open: (id: number) => request<Cycle>('POST', `/cycles/${id}/open`, undefined, { auth: true }),
	close: (id: number) => request<Cycle>('POST', `/cycles/${id}/close`, undefined, { auth: true }),
	reopen: (id: number) => request<Cycle>('POST', `/cycles/${id}/reopen`, undefined, { auth: true }),
	finalize: (id: number) => request<FinalizedCycle>('POST', `/cycles/${id}/finalize`, undefined, { auth: true }),
};
