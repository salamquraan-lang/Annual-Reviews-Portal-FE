import { CYCLE_STATUSES, CYCLE_TYPES, CYCLE_TYPE_LABELS } from '../types/cycles';
import type {
	Cycle,
	CycleAction,
	CycleInput,
	CycleListParams,
	CycleStatus,
	CycleType,
	CycleUpdate,
} from '../types/cycles';

export const NAME_MAX_LENGTH = 120;
export const YEAR_MIN = 2000;
export const YEAR_MAX = 2100;

const ACTIONS_BY_STATUS: Record<CycleStatus, CycleAction[]> = {
	draft: ['edit', 'delete', 'readiness', 'open', 'copy'],
	open: ['changeEndDate', 'close', 'copy'],
	closed: ['reopen', 'finalize', 'copy'],
	finalized: ['copy'],
};

export function allowedActions(status: CycleStatus): CycleAction[] {
	return ACTIONS_BY_STATUS[status];
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isValidDateText(value: string): boolean {
	const match = DATE_PATTERN.exec(value);
	if (!match) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

export function formatDate(value: string): string {
	if (!isValidDateText(value)) return value;
	const [year, month, day] = value.split('-').map(Number);
	return `${day} ${MONTHS[month - 1]} ${year}`;
}

function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function addYears(value: string, years: number): string {
	if (!isValidDateText(value)) return value;
	const [year, month, day] = value.split('-').map(Number);
	const target = year + years;
	const targetDay = month === 2 && day === 29 && !isLeapYear(target) ? 28 : day;
	return [
		String(target).padStart(4, '0'),
		String(month).padStart(2, '0'),
		String(targetDay).padStart(2, '0'),
	].join('-');
}

export function suggestCopy(source: Cycle): CycleInput {
	const year = source.year + 1;
	const oldYear = String(source.year);
	const name = source.name.includes(oldYear)
		? source.name.split(oldYear).join(String(year))
		: `${CYCLE_TYPE_LABELS[source.type]} ${year}`;

	return {
		name,
		type: source.type,
		year,
		startDate: addYears(source.startDate, 1),
		endDate: addYears(source.endDate, 1),
	};
}

export interface CycleFormValues {
	name: string;
	type: CycleType;
	year: string;
	startDate: string;
	endDate: string;
}

export type CycleFormField = keyof CycleFormValues;
export type CycleFormErrors = Partial<Record<CycleFormField, string>>;

export function toFormValues(input: CycleInput): CycleFormValues {
	return {
		name: input.name,
		type: input.type,
		year: String(input.year),
		startDate: input.startDate,
		endDate: input.endDate,
	};
}

export function toCycleInput(values: CycleFormValues): CycleInput {
	return {
		name: values.name.trim(),
		type: values.type,
		year: Number(values.year.trim()),
		startDate: values.startDate,
		endDate: values.endDate,
	};
}

export function validateCycleForm(values: CycleFormValues): CycleFormErrors {
	const errors: CycleFormErrors = {};

	const name = values.name.trim();
	if (!name) errors.name = 'Enter a cycle name.';
	else if (name.length > NAME_MAX_LENGTH) {
		errors.name = `The name must be at most ${NAME_MAX_LENGTH} characters.`;
	}

	const year = values.year.trim();
	if (!/^\d+$/.test(year) || Number(year) < YEAR_MIN || Number(year) > YEAR_MAX) {
		errors.year = `Enter a year between ${YEAR_MIN} and ${YEAR_MAX}.`;
	}

	if (!values.startDate) errors.startDate = 'Choose a start date.';
	else if (!isValidDateText(values.startDate)) errors.startDate = 'Enter a valid start date.';

	if (!values.endDate) errors.endDate = 'Choose an end date.';
	else if (!isValidDateText(values.endDate)) errors.endDate = 'Enter a valid end date.';

	if (!errors.startDate && !errors.endDate && values.startDate > values.endDate) {
		errors.endDate = 'The end date must not be before the start date.';
	}

	return errors;
}

export function changedFields(cycle: Cycle, input: CycleInput): CycleUpdate {
	const update: CycleUpdate = {};
	if (input.name !== cycle.name) update.name = input.name;
	if (input.type !== cycle.type) update.type = input.type;
	if (input.year !== cycle.year) update.year = input.year;
	if (input.startDate !== cycle.startDate) update.startDate = input.startDate;
	if (input.endDate !== cycle.endDate) update.endDate = input.endDate;
	return update;
}

export function parseYear(value: string | null): number | undefined {
	if (value === null || !/^\d+$/.test(value)) return undefined;
	const year = Number(value);
	return year >= YEAR_MIN && year <= YEAR_MAX ? year : undefined;
}

export function parseCycleFilters(search: URLSearchParams): CycleListParams {
	const status = search.get('status');
	const type = search.get('type');
	const pageText = search.get('page');
	const page = pageText !== null && /^\d+$/.test(pageText) ? Number(pageText) : 0;

	return {
		status: CYCLE_STATUSES.find((s) => s === status),
		type: CYCLE_TYPES.find((t) => t === type),
		year: parseYear(search.get('year')),
		page: page >= 1 ? page : undefined,
	};
}

export function cycleYearWarning(values: CycleFormValues): string | null {
	const year = parseYear(values.year.trim());
	if (year === undefined) return null;
	if (!isValidDateText(values.startDate) || !isValidDateText(values.endDate)) return null;

	const startYear = Number(values.startDate.slice(0, 4));
	const endYear = Number(values.endDate.slice(0, 4));
	if (year >= startYear - 1 && year <= endYear) return null;

	const span = startYear === endYear ? String(startYear) : `${startYear}–${endYear}`;
	return `The dates are in ${span} but the year is ${year}. Check that this is what you want.`;
}
