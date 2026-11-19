import type { Criterion, QuestionListItem } from '../types/questionBank';
import type { Template, TemplateQuestion, TemplateSummary } from '../types/templates';

export function makeCriterion(overrides: Partial<Criterion> = {}): Criterion {
	return { id: 1, name: 'Communication', description: null, questionCount: 0, ...overrides };
}

export function makeQuestionItem(overrides: Partial<QuestionListItem> = {}): QuestionListItem {
	return {
		id: 1,
		criterion: { id: 1, name: 'Communication' },
		text: 'Explains ideas clearly.',
		kind: 'rating',
		archived: false,
		archivedAt: null,
		used: false,
		lastUsedCycle: null,
		...overrides,
	};
}

export function makeTemplateQuestion(overrides: Partial<TemplateQuestion> = {}): TemplateQuestion {
	return {
		questionId: 1,
		position: 1,
		text: 'Explains ideas clearly.',
		kind: 'rating',
		weight: 1,
		archived: false,
		...overrides,
	};
}

export function makeTemplateSummary(overrides: Partial<TemplateSummary> = {}): TemplateSummary {
	return { id: 10, cycleId: 1, reviewType: 'manager', name: 'Manager review', questionCount: 0, ...overrides };
}

/** A draft manager form with two criteria: Communication (two rating, one text) and Delivery (one rating). */
export function makeTemplate(overrides: Partial<Template> = {}): Template {
	return {
		...makeTemplateSummary({ questionCount: 4 }),
		cycleStatus: 'draft',
		editable: true,
		copiedFromId: null,
		sections: [
			{
				criterion: { id: 1, name: 'Communication' },
				questions: [
					makeTemplateQuestion({ questionId: 1, position: 1, text: 'Explains ideas clearly.', weight: 3 }),
					makeTemplateQuestion({ questionId: 2, position: 2, text: 'Listens to others.', weight: 1 }),
					makeTemplateQuestion({
						questionId: 3,
						position: 3,
						text: 'What should they keep doing?',
						kind: 'text',
						weight: null,
					}),
				],
			},
			{
				criterion: { id: 2, name: 'Delivery' },
				questions: [makeTemplateQuestion({ questionId: 4, position: 4, text: 'Meets deadlines.', weight: 1 })],
			},
		],
		...overrides,
	};
}
