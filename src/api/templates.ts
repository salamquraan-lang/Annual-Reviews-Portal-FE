import { request } from './client';
import type { Template, TemplateSummary } from '../types/templates';

const auth = { auth: true };

export const templatesApi = {
	listForCycle: (cycleId: number) =>
		request<TemplateSummary[]>('GET', `/cycles/${cycleId}/templates`, undefined, auth),
	get: (id: number) => request<Template>('GET', `/templates/${id}`, undefined, auth),
	rename: (id: number, name: string) => request<Template>('PATCH', `/templates/${id}`, { name }, auth),
	addQuestion: (id: number, questionId: number, weight?: number) =>
		request<Template>(
			'POST',
			`/templates/${id}/questions`,
			weight === undefined ? { questionId } : { questionId, weight },
			auth,
		),
	removeQuestion: (id: number, questionId: number) =>
		request<Template>('DELETE', `/templates/${id}/questions/${questionId}`, undefined, auth),
	changeWeight: (id: number, questionId: number, weight: number) =>
		request<Template>('PATCH', `/templates/${id}/questions/${questionId}`, { weight }, auth),
	replaceQuestion: (id: number, questionId: number, newQuestionId: number) =>
		request<Template>('POST', `/templates/${id}/questions/${questionId}/replace`, { questionId: newQuestionId }, auth),
	reorderQuestions: (id: number, criterionId: number, questionIds: number[]) =>
		request<Template>('PUT', `/templates/${id}/criteria/${criterionId}/question-order`, { questionIds }, auth),
	reorderCriteria: (id: number, criterionIds: number[]) =>
		request<Template>('PUT', `/templates/${id}/criterion-order`, { criterionIds }, auth),
	copyFrom: (id: number, sourceTemplateId: number) =>
		request<Template>('POST', `/templates/${id}/copy-from`, { sourceTemplateId }, auth),
};
