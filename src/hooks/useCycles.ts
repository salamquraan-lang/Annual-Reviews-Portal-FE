import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { cyclesApi } from '../api/cycles';
import type { CycleListParams } from '../types/cycles';

export const cycleKeys = {
	all: ['cycles'] as const,
	list: (params: CycleListParams) => [...cycleKeys.all, 'list', params] as const,
	detail: (id: number) => [...cycleKeys.all, 'detail', id] as const,
	readiness: (id: number) => [...cycleKeys.all, 'readiness', id] as const,
	current: () => [...cycleKeys.all, 'current'] as const,
};

export function useCycles(params: CycleListParams) {
	return useQuery({
		queryKey: cycleKeys.list(params),
		queryFn: () => cyclesApi.list(params),
		placeholderData: keepPreviousData,
	});
}

export function useCycle(id: number) {
	return useQuery({
		queryKey: cycleKeys.detail(id),
		queryFn: () => cyclesApi.get(id),
		enabled: Number.isInteger(id),
	});
}

export function useCycleReadiness(id: number, enabled: boolean) {
	return useQuery({
		queryKey: cycleKeys.readiness(id),
		queryFn: () => cyclesApi.readiness(id),
		enabled,
		staleTime: 0,
	});
}

export function useCurrentCycle() {
	return useQuery({
		queryKey: cycleKeys.current(),
		queryFn: async () => {
			try {
				return await cyclesApi.current();
			} catch (err) {
				if (err instanceof ApiError && err.code === 'NO_OPEN_CYCLE') return null;
				throw err;
			}
		},
	});
}
