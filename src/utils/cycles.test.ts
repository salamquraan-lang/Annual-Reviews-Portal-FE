import { describe, expect, it } from 'vitest';
import { makeCycle } from '../test/fixtures';
import {
	addYears,
	allowedActions,
	changedFields,
	cycleYearWarning,
	formatDate,
	isValidDateText,
	parseCycleFilters,
	parseYear,
	suggestCopy,
	toCycleInput,
	toFormValues,
	validateCycleForm,
} from './cycles';
import type { CycleFormValues } from './cycles';

function formValues(overrides: Partial<CycleFormValues> = {}): CycleFormValues {
	return {
		name: 'Annual 2026',
		type: 'annual',
		year: '2026',
		startDate: '2026-01-01',
		endDate: '2026-12-31',
		...overrides,
	};
}

describe('allowedActions', () => {
	it('allows edit, delete, readiness, open and copy on a draft', () => {
		expect(allowedActions('draft')).toEqual(['edit', 'delete', 'readiness', 'open', 'copy']);
	});

	it('allows end date change, close and copy on an open cycle', () => {
		expect(allowedActions('open')).toEqual(['changeEndDate', 'close', 'copy']);
	});

	it('allows reopen, finalize and copy on a closed cycle', () => {
		expect(allowedActions('closed')).toEqual(['reopen', 'finalize', 'copy']);
	});

	it('allows only copy on a finalized cycle', () => {
		expect(allowedActions('finalized')).toEqual(['copy']);
	});
});

describe('isValidDateText', () => {
	it('accepts real dates', () => {
		expect(isValidDateText('2026-01-31')).toBe(true);
		expect(isValidDateText('2024-02-29')).toBe(true);
	});

	it('rejects dates that do not exist', () => {
		expect(isValidDateText('2026-02-30')).toBe(false);
		expect(isValidDateText('2025-02-29')).toBe(false);
		expect(isValidDateText('2026-13-01')).toBe(false);
	});

	it('rejects text in the wrong shape', () => {
		expect(isValidDateText('')).toBe(false);
		expect(isValidDateText('2026-1-1')).toBe(false);
		expect(isValidDateText('01/02/2026')).toBe(false);
	});
});

describe('formatDate', () => {
	it('formats a date as day, short month, year', () => {
		expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
		expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
	});

	it('returns the original text when it is not a valid date', () => {
		expect(formatDate('not a date')).toBe('not a date');
	});
});

describe('addYears', () => {
	it('moves a date forward by whole years', () => {
		expect(addYears('2026-03-15', 1)).toBe('2027-03-15');
	});

	it('moves 29 Feb to 28 Feb when the target year is not a leap year', () => {
		expect(addYears('2024-02-29', 1)).toBe('2025-02-28');
	});

	it('keeps 29 Feb when the target year is a leap year', () => {
		expect(addYears('2024-02-29', 4)).toBe('2028-02-29');
	});

	it('returns invalid text unchanged', () => {
		expect(addYears('nope', 1)).toBe('nope');
	});
});

describe('suggestCopy', () => {
	it('adds one year to the year and the dates', () => {
		const copy = suggestCopy(makeCycle());
		expect(copy.year).toBe(2027);
		expect(copy.startDate).toBe('2027-01-01');
		expect(copy.endDate).toBe('2027-12-31');
		expect(copy.type).toBe('annual');
	});

	it('replaces the year inside the name', () => {
		expect(suggestCopy(makeCycle({ name: 'Annual 2026' })).name).toBe('Annual 2027');
	});

	it('replaces every occurrence of the year in the name', () => {
		expect(suggestCopy(makeCycle({ name: '2026 review 2026' })).name).toBe('2027 review 2027');
	});

	it('builds a name from the type when the name has no year', () => {
		expect(suggestCopy(makeCycle({ name: 'Spring review' })).name).toBe('Annual 2027');
		expect(suggestCopy(makeCycle({ name: 'Spring review', type: 'midyear' })).name).toBe(
			'Midyear 2027',
		);
	});
});

describe('toFormValues and toCycleInput', () => {
	it('turns the year into text for the form', () => {
		expect(toFormValues(makeCycle()).year).toBe('2026');
	});

	it('trims the name and the year and turns the year into a number', () => {
		const input = toCycleInput(formValues({ name: '  Annual 2026  ', year: ' 2026 ' }));
		expect(input.name).toBe('Annual 2026');
		expect(input.year).toBe(2026);
	});
});

describe('validateCycleForm', () => {
	it('returns no errors for a valid form', () => {
		expect(validateCycleForm(formValues())).toEqual({});
	});

	it('requires a name', () => {
		expect(validateCycleForm(formValues({ name: '   ' })).name).toBe('Enter a cycle name.');
	});

	it('limits the name length', () => {
		const errors = validateCycleForm(formValues({ name: 'a'.repeat(121) }));
		expect(errors.name).toBe('The name must be at most 120 characters.');
		expect(validateCycleForm(formValues({ name: 'a'.repeat(120) })).name).toBeUndefined();
	});

	it('limits the year to 2000 through 2100', () => {
		expect(validateCycleForm(formValues({ year: '1999' })).year).toBeDefined();
		expect(validateCycleForm(formValues({ year: '2101' })).year).toBeDefined();
		expect(validateCycleForm(formValues({ year: 'abc' })).year).toBeDefined();
		expect(validateCycleForm(formValues({ year: '' })).year).toBeDefined();
		expect(validateCycleForm(formValues({ year: '2000' })).year).toBeUndefined();
		expect(validateCycleForm(formValues({ year: '2100' })).year).toBeUndefined();
	});

	it('requires both dates', () => {
		const errors = validateCycleForm(formValues({ startDate: '', endDate: '' }));
		expect(errors.startDate).toBe('Choose a start date.');
		expect(errors.endDate).toBe('Choose an end date.');
	});

	it('rejects dates that do not exist', () => {
		const errors = validateCycleForm(formValues({ startDate: '2026-02-30' }));
		expect(errors.startDate).toBe('Enter a valid start date.');
	});

	it('rejects a start date after the end date', () => {
		const errors = validateCycleForm(formValues({ startDate: '2026-06-02', endDate: '2026-06-01' }));
		expect(errors.endDate).toBe('The end date must not be before the start date.');
	});

	it('accepts a start date equal to the end date', () => {
		const errors = validateCycleForm(formValues({ startDate: '2026-06-01', endDate: '2026-06-01' }));
		expect(errors).toEqual({});
	});
});

describe('changedFields', () => {
	it('returns only the fields that changed', () => {
		const cycle = makeCycle();
		const input = { ...toCycleInput(toFormValues(cycle)), name: 'Renamed', endDate: '2026-11-30' };
		expect(changedFields(cycle, input)).toEqual({ name: 'Renamed', endDate: '2026-11-30' });
	});

	it('returns an empty object when nothing changed', () => {
		const cycle = makeCycle();
		expect(changedFields(cycle, toCycleInput(toFormValues(cycle)))).toEqual({});
	});
});

describe('parseYear', () => {
	it('parses a year in range', () => {
		expect(parseYear('2026')).toBe(2026);
	});

	it('returns undefined for null, text and out of range values', () => {
		expect(parseYear(null)).toBeUndefined();
		expect(parseYear('')).toBeUndefined();
		expect(parseYear('20x6')).toBeUndefined();
		expect(parseYear('1999')).toBeUndefined();
		expect(parseYear('2101')).toBeUndefined();
	});
});

describe('parseCycleFilters', () => {
	it('reads valid filters from the URL', () => {
		const filters = parseCycleFilters(
			new URLSearchParams('status=open&type=midyear&year=2026&page=3'),
		);
		expect(filters).toEqual({ status: 'open', type: 'midyear', year: 2026, page: 3 });
	});

	it('drops values that are not allowed', () => {
		const filters = parseCycleFilters(
			new URLSearchParams('status=archived&type=weekly&year=abc&page=0'),
		);
		expect(filters.status).toBeUndefined();
		expect(filters.type).toBeUndefined();
		expect(filters.year).toBeUndefined();
		expect(filters.page).toBeUndefined();
	});

	it('drops a page that is not a whole number', () => {
		expect(parseCycleFilters(new URLSearchParams('page=-2')).page).toBeUndefined();
		expect(parseCycleFilters(new URLSearchParams('page=1.5')).page).toBeUndefined();
	});

	it('returns no filters for an empty URL', () => {
		const filters = parseCycleFilters(new URLSearchParams());
		expect(Object.values(filters).every((value) => value === undefined)).toBe(true);
	});
});

describe('cycleYearWarning', () => {
	it('does not warn when the year matches the dates', () => {
		expect(cycleYearWarning(formValues())).toBeNull();
	});

	it('does not warn for the previous year, as in Annual 2025 run in 2026', () => {
		expect(cycleYearWarning(formValues({ year: '2025' }))).toBeNull();
	});

	it('does not warn when the year is the end year of a span across two years', () => {
		expect(
			cycleYearWarning(formValues({ year: '2027', startDate: '2026-11-01', endDate: '2027-02-01' })),
		).toBeNull();
	});

	it('warns when the year is more than one year before the start', () => {
		expect(cycleYearWarning(formValues({ year: '2022' }))).toBe(
			'The dates are in 2026 but the year is 2022. Check that this is what you want.',
		);
	});

	it('warns when the year is after the end', () => {
		expect(cycleYearWarning(formValues({ year: '2027' }))).toBe(
			'The dates are in 2026 but the year is 2027. Check that this is what you want.',
		);
	});

	it('names both years when the dates span two years', () => {
		expect(
			cycleYearWarning(formValues({ year: '2030', startDate: '2026-11-01', endDate: '2027-02-01' })),
		).toBe('The dates are in 2026–2027 but the year is 2030. Check that this is what you want.');
	});

	it('does not warn when the year or a date is invalid', () => {
		expect(cycleYearWarning(formValues({ year: 'abc' }))).toBeNull();
		expect(cycleYearWarning(formValues({ startDate: '' }))).toBeNull();
		expect(cycleYearWarning(formValues({ endDate: '2026-02-30' }))).toBeNull();
	});
});
