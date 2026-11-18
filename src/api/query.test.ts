import { describe, expect, it } from 'vitest';
import { toQuery } from './query';

describe('toQuery', () => {
	it('builds a query string from the given values', () => {
		expect(toQuery({ status: 'open', year: 2026 })).toBe('?status=open&year=2026');
	});

	it('skips undefined, null and empty values', () => {
		expect(toQuery({ status: undefined, type: null, search: '', year: 2026 })).toBe('?year=2026');
	});

	it('keeps false and 0 because they are real values', () => {
		expect(toQuery({ isActive: false, page: 0 })).toBe('?isActive=false&page=0');
	});

	it('returns an empty string when there is nothing to send', () => {
		expect(toQuery({})).toBe('');
		expect(toQuery({ status: undefined })).toBe('');
	});

	it('encodes special characters', () => {
		expect(toQuery({ search: 'a b&c' })).toBe('?search=a+b%26c');
	});
});
