import { describe, expect, it } from 'vitest';
import { makeTemplate } from '../test/questionBankFixtures';
import { moved, parseWeight, questionIds, weightShares } from './templates';

describe('moved', () => {
	it('swaps an item with the one above or below', () => {
		expect(moved([1, 2, 3], 1, -1)).toEqual([2, 1, 3]);
		expect(moved([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
	});

	it('returns null at either end, so nothing is sent', () => {
		expect(moved([1, 2, 3], 0, -1)).toBeNull();
		expect(moved([1, 2, 3], 2, 1)).toBeNull();
		expect(moved([], 0, 1)).toBeNull();
	});

	it('does not change the list it was given', () => {
		const list = [1, 2];
		moved(list, 0, 1);
		expect(list).toEqual([1, 2]);
	});
});

describe('weightShares', () => {
	it('turns relative weights into percentages of the criterion', () => {
		const [communication, delivery] = makeTemplate().sections;
		const shares = weightShares(communication);
		expect(shares.get(1)).toBe(75);
		expect(shares.get(2)).toBe(25);
		expect(weightShares(delivery).get(4)).toBe(100);
	});

	it('gives written-answer questions no share', () => {
		expect(weightShares(makeTemplate().sections[0]).has(3)).toBe(false);
	});

	it('is empty for a section with no rating question', () => {
		const section = makeTemplate().sections[0];
		const textOnly = { ...section, questions: section.questions.filter((q) => q.kind === 'text') };
		expect(weightShares(textOnly).size).toBe(0);
	});
});

describe('questionIds', () => {
	it('collects every question of every section', () => {
		expect([...questionIds(makeTemplate().sections)]).toEqual([1, 2, 3, 4]);
	});
});

describe('parseWeight', () => {
	it('accepts whole numbers from 1 to the maximum', () => {
		expect(parseWeight('1', 1000)).toBe(1);
		expect(parseWeight(' 25 ', 1000)).toBe(25);
		expect(parseWeight('1000', 1000)).toBe(1000);
	});

	it('refuses zero, too large, decimals, signs and text', () => {
		for (const value of ['0', '1001', '1.5', '-2', '+3', '1e2', 'abc', '']) {
			expect(parseWeight(value, 1000)).toBeNull();
		}
	});
});
