import type { CycleStatus } from './cycles';
import type { QuestionKind, ReviewType } from './questionBank';

export interface TemplateSummary {
	id: number;
	cycleId: number;
	reviewType: ReviewType;
	name: string;
	questionCount: number;
}

export interface TemplateQuestion {
	questionId: number;
	/** Place in the whole form, from 1. */
	position: number;
	text: string;
	kind: QuestionKind;
	/** Null for a written-answer question. */
	weight: number | null;
	archived: boolean;
}

export interface TemplateSection {
	criterion: { id: number; name: string };
	questions: TemplateQuestion[];
}

export interface Template extends TemplateSummary {
	cycleStatus: CycleStatus;
	/** True while the cycle is a draft. */
	editable: boolean;
	copiedFromId: number | null;
	sections: TemplateSection[];
}

/** The order the four forms are shown in. */
export const REVIEW_TYPES: ReviewType[] = ['self', 'manager', 'peer', 'upward'];

export const MAX_WEIGHT = 1000;
