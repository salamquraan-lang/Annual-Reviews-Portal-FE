import type { TemplateSection } from '../types/templates';

/** The list with the item at `index` swapped with its neighbour. Returns null at either end. */
export function moved<T>(items: T[], index: number, direction: -1 | 1): T[] | null {
	const target = index + direction;
	if (index < 0 || index >= items.length || target < 0 || target >= items.length) return null;
	const copy = [...items];
	[copy[index], copy[target]] = [copy[target], copy[index]];
	return copy;
}

/**
 * Each rating question's share of its criterion, in percent, rounded to whole numbers.
 * A weight is relative: 2 and 1 in one criterion mean 67 % and 33 %. Text questions have no share.
 */
export function weightShares(section: TemplateSection): Map<number, number> {
	const rated = section.questions.filter((question) => question.weight !== null);
	const total = rated.reduce((sum, question) => sum + (question.weight ?? 0), 0);
	const shares = new Map<number, number>();
	if (total === 0) return shares;
	for (const question of rated) {
		shares.set(question.questionId, Math.round(((question.weight ?? 0) / total) * 100));
	}
	return shares;
}

/** The ids of every question in the template, in form order. */
export function questionIds(sections: TemplateSection[]): Set<number> {
	return new Set(sections.flatMap((section) => section.questions.map((question) => question.questionId)));
}

/** A weight typed by the user: a whole number from 1 to max, or null when it is not one. */
export function parseWeight(value: string, max: number): number | null {
	if (!/^\d+$/.test(value.trim())) return null;
	const weight = Number(value);
	return weight >= 1 && weight <= max ? weight : null;
}
