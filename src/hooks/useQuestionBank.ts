import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { criteriaApi, questionsApi } from '../api/questionBank';
import type {
	CriterionCreate,
	CriterionUpdate,
	QuestionCreate,
	QuestionListParams,
	QuestionUpdate,
} from '../types/questionBank';

export const questionBankKeys = {
	all: ['question-bank'] as const,
	criteria: () => [...questionBankKeys.all, 'criteria'] as const,
	questions: (params: QuestionListParams) => [...questionBankKeys.all, 'questions', params] as const,
	question: (id: number) => [...questionBankKeys.all, 'question', id] as const,
};

export function useCriteria() {
	return useQuery({
		queryKey: questionBankKeys.criteria(),
		queryFn: async () => (await criteriaApi.list()).items,
	});
}

export function useQuestions(params: QuestionListParams) {
	return useQuery({
		queryKey: questionBankKeys.questions(params),
		queryFn: () => questionsApi.list(params),
		placeholderData: keepPreviousData,
	});
}

export function useQuestion(id: number | null) {
	return useQuery({
		queryKey: questionBankKeys.question(id ?? 0),
		queryFn: () => questionsApi.get(id as number),
		enabled: id !== null,
	});
}

// A change to a criterion or a question can change counts and usage everywhere on the page,
// so every question bank query is refreshed, also after a failed change (it may be out of date).
function useRefresh() {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: questionBankKeys.all });
}

export function useCreateCriterion() {
	const refresh = useRefresh();
	return useMutation({ mutationFn: (data: CriterionCreate) => criteriaApi.create(data), onSettled: refresh });
}

export function useUpdateCriterion() {
	const refresh = useRefresh();
	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: CriterionUpdate }) => criteriaApi.update(id, data),
		onSettled: refresh,
	});
}

export function useDeleteCriterion() {
	const refresh = useRefresh();
	return useMutation({ mutationFn: (id: number) => criteriaApi.remove(id), onSettled: refresh });
}

export function useCreateQuestion() {
	const refresh = useRefresh();
	return useMutation({ mutationFn: (data: QuestionCreate) => questionsApi.create(data), onSettled: refresh });
}

export function useUpdateQuestion() {
	const refresh = useRefresh();
	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: QuestionUpdate }) => questionsApi.update(id, data),
		onSettled: refresh,
	});
}

export function useCopyQuestion() {
	const refresh = useRefresh();
	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: QuestionUpdate }) => questionsApi.copy(id, data),
		onSettled: refresh,
	});
}

export function useArchiveQuestion() {
	const refresh = useRefresh();
	return useMutation({
		mutationFn: ({ id, archive }: { id: number; archive: boolean }) =>
			archive ? questionsApi.archive(id) : questionsApi.unarchive(id),
		onSettled: refresh,
	});
}

export function useDeleteQuestion() {
	const refresh = useRefresh();
	return useMutation({ mutationFn: (id: number) => questionsApi.remove(id), onSettled: refresh });
}
