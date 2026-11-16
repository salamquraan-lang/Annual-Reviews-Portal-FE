import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cyclesApi } from '../api/cycles';
import type { CycleInput, CycleUpdate } from '../types/cycles';
import { cycleKeys } from './useCycles';

function useRefreshCycles() {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: cycleKeys.all });
}

export function useCreateCycle() {
	const refresh = useRefreshCycles();
	return useMutation({
		mutationFn: (data: CycleInput) => cyclesApi.create(data),
		onSuccess: refresh,
	});
}

export function useCopyCycle() {
	const refresh = useRefreshCycles();
	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: CycleInput }) => cyclesApi.copy(id, data),
		onSuccess: refresh,
	});
}

export function useUpdateCycle() {
	const refresh = useRefreshCycles();
	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: CycleUpdate }) => cyclesApi.update(id, data),
		onSettled: refresh,
	});
}

export function useChangeCycleEndDate() {
	const refresh = useRefreshCycles();
	return useMutation({
		mutationFn: ({ id, endDate }: { id: number; endDate: string }) =>
			cyclesApi.changeEndDate(id, endDate),
		onSettled: refresh,
	});
}

export function useDeleteCycle() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => cyclesApi.remove(id),
		onSuccess: (_data, id) => {
			queryClient.invalidateQueries({ queryKey: cycleKeys.detail(id), refetchType: 'none' });
			queryClient.invalidateQueries({ queryKey: cycleKeys.readiness(id), refetchType: 'none' });
			return queryClient.invalidateQueries({
				queryKey: cycleKeys.all,
				predicate: (query) => query.queryKey[2] !== id,
			});
		},
	});
}

export function useOpenCycle() {
	const refresh = useRefreshCycles();
	return useMutation({
		mutationFn: (id: number) => cyclesApi.open(id),
		onSettled: refresh,
	});
}

export function useCloseCycle() {
	const refresh = useRefreshCycles();
	return useMutation({
		mutationFn: (id: number) => cyclesApi.close(id),
		onSettled: refresh,
	});
}

export function useReopenCycle() {
	const refresh = useRefreshCycles();
	return useMutation({
		mutationFn: (id: number) => cyclesApi.reopen(id),
		onSettled: refresh,
	});
}

export function useFinalizeCycle() {
	const refresh = useRefreshCycles();
	return useMutation({
		mutationFn: (id: number) => cyclesApi.finalize(id),
		onSettled: refresh,
	});
}
