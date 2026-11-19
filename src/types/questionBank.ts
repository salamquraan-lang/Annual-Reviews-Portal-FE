import type { Page } from './common';
import type { CycleStatus } from './cycles';

export type QuestionKind = 'rating' | 'text';
export type ReviewType = 'self' | 'manager' | 'peer' | 'upward';

export interface Criterion {
	id: number;
	name: string;
	description: string | null;
	questionCount: number;
}

export interface CriterionQuestion {
	id: number;
	text: string;
	kind: QuestionKind;
	archived: boolean;
}

export interface CriterionDetail extends Criterion {
	questions: CriterionQuestion[];
}

export interface CriterionCreate {
	name: string;
	description?: string | null;
}

export interface CriterionUpdate {
	name?: string;
	description?: string | null;
}

export interface CycleRef {
	id: number;
	name: string;
	status: CycleStatus;
}

export interface Question {
	id: number;
	criterion: { id: number; name: string };
	text: string;
	kind: QuestionKind;
	archived: boolean;
	archivedAt: string | null;
}

export interface QuestionListItem extends Question {
	used: boolean;
	/** The newest cycle with a template that uses the question. */
	lastUsedCycle: CycleRef | null;
}

export interface QuestionUsage {
	templateId: number;
	templateName: string;
	reviewType: ReviewType;
	cycle: CycleRef;
}

export interface QuestionDetail extends Question {
	/** True when a cycle that was opened uses the question, so it cannot be edited. */
	locked: boolean;
	usage: QuestionUsage[];
}

export interface QuestionListParams {
	criterionId?: number;
	kind?: QuestionKind;
	used?: boolean;
	showArchived?: boolean;
	search?: string;
	page?: number;
	pageSize?: number;
}

export type QuestionPage = Page<QuestionListItem>;

export interface QuestionCreate {
	criterionId: number;
	text: string;
	kind: QuestionKind;
}

export type QuestionUpdate = Partial<QuestionCreate>;
