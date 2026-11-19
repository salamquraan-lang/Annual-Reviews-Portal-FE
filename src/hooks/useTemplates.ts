import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { templatesApi } from '../api/templates';
import type { Template } from '../types/templates';
import { cycleKeys } from './useCycles';
import { questionBankKeys } from './useQuestionBank';

export const templateKeys = {
	all: ['templates'] as const,
	forCycle: (cycleId: number) => [...templateKeys.all, 'cycle', cycleId] as const,
	detail: (id: number) => [...templateKeys.all, 'detail', id] as const,
};

export function useCycleTemplates(cycleId: number | null) {
	return useQuery({
		queryKey: templateKeys.forCycle(cycleId ?? 0),
		queryFn: () => templatesApi.listForCycle(cycleId as number),
		enabled: cycleId !== null && Number.isInteger(cycleId),
	});
}

export function useTemplate(id: number | null) {
	return useQuery({
		queryKey: templateKeys.detail(id ?? 0),
		queryFn: () => templatesApi.get(id as number),
		enabled: id !== null,
	});
}

/**
 * Every change returns the whole template. It is stored at once, and the other views that can
 * change with it are refreshed: the template lists (question counts), the cycle readiness, and
 * the question bank (where each question is used). After a failure everything is refreshed too,
 * because the error may mean the page was out of date.
 */
export function useTemplateChange<Args>(id: number, change: (args: Args) => Promise<Template>) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: change,
		onSuccess: (template) => queryClient.setQueryData(templateKeys.detail(id), template),
		onSettled: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: templateKeys.all }),
				queryClient.invalidateQueries({ queryKey: cycleKeys.all }),
				queryClient.invalidateQueries({ queryKey: questionBankKeys.all }),
			]),
	});
}
