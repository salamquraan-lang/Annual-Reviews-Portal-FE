import { request } from './client';
import { toQuery } from './query';
import type {
	Criterion,
	CriterionCreate,
	CriterionDetail,
	CriterionUpdate,
	QuestionCreate,
	QuestionDetail,
	QuestionListParams,
	QuestionPage,
	QuestionUpdate,
} from '../types/questionBank';

const auth = { auth: true };

export const criteriaApi = {
	list: () => request<{ items: Criterion[] }>('GET', '/criteria', undefined, auth),
	get: (id: number) => request<CriterionDetail>('GET', `/criteria/${id}`, undefined, auth),
	create: (data: CriterionCreate) => request<Criterion>('POST', '/criteria', data, auth),
	update: (id: number, data: CriterionUpdate) =>
		request<CriterionDetail>('PATCH', `/criteria/${id}`, data, auth),
	remove: (id: number) => request<void>('DELETE', `/criteria/${id}`, undefined, auth),
};

export const questionsApi = {
	list: (params: QuestionListParams = {}) =>
		request<QuestionPage>('GET', `/questions${toQuery(params)}`, undefined, auth),
	get: (id: number) => request<QuestionDetail>('GET', `/questions/${id}`, undefined, auth),
	create: (data: QuestionCreate) => request<QuestionDetail>('POST', '/questions', data, auth),
	update: (id: number, data: QuestionUpdate) =>
		request<QuestionDetail>('PATCH', `/questions/${id}`, data, auth),
	copy: (id: number, data: QuestionUpdate = {}) =>
		request<QuestionDetail>('POST', `/questions/${id}/copy`, data, auth),
	archive: (id: number) => request<QuestionDetail>('POST', `/questions/${id}/archive`, undefined, auth),
	unarchive: (id: number) => request<QuestionDetail>('POST', `/questions/${id}/unarchive`, undefined, auth),
	remove: (id: number) => request<void>('DELETE', `/questions/${id}`, undefined, auth),
};
