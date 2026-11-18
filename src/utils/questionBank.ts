import { ApiError } from '../api/client';
import type { QuestionKind, ReviewType } from '../types/questionBank';

export const KIND_LABELS: Record<QuestionKind, string> = {
	rating: 'Rating',
	text: 'Written answer',
};

export const REVIEW_TYPE_LABELS: Record<ReviewType, string> = {
	self: 'Self review',
	manager: 'Manager review',
	peer: 'Peer review',
	upward: 'Upward review',
};

/** The field errors of a 400 response, by field name ("name", "text", "criterionId"...). */
export function fieldErrors(error: unknown): Record<string, string> {
	const result: Record<string, string> = {};
	if (error instanceof ApiError) {
		for (const item of error.fieldErrors) {
			if (item.field && !(item.field in result)) result[item.field] = item.message;
		}
	}
	return result;
}

/** One sentence for the user. Most server messages are already written for people. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
	if (!(error instanceof ApiError)) return fallback;
	switch (error.code) {
		case 'TRY_AGAIN':
			return 'Someone else changed this at the same moment. Please try again.';
		case 'VALIDATION_ERROR':
			return 'Some fields are invalid. Check them and try again.';
		default:
			return error.message || fallback;
	}
}
