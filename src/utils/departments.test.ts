import { describe, expect, it } from 'vitest';
import type { DepartmentTreeNode } from '../types/departments';
import { flattenTree, matchesSearch, sortDepartments } from './departments';
import type { FlatDepartment } from './departments';

const tree: DepartmentTreeNode[] = [
	{
		id: 1,
		name: 'Engineering',
		isActive: true,
		children: [
			{
				id: 2,
				name: 'Platform',
				isActive: true,
				children: [{ id: 3, name: 'Infra', isActive: false, children: [] }],
			},
			{ id: 4, name: 'Apps', isActive: true, children: [] },
		],
	},
	{ id: 5, name: 'Finance', isActive: true, children: [] },
];

describe('flattenTree', () => {
	it('returns every node once, parents before children', () => {
		expect(flattenTree(tree).map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
	});

	it('sets the level from the depth, starting at 1', () => {
		const levels = Object.fromEntries(flattenTree(tree).map((row) => [row.id, row.level]));
		expect(levels).toEqual({ 1: 1, 2: 2, 3: 3, 4: 2, 5: 1 });
	});

	it('records the parent id, which is null for top level nodes', () => {
		const parents = Object.fromEntries(flattenTree(tree).map((row) => [row.id, row.parentId]));
		expect(parents).toEqual({ 1: null, 2: 1, 3: 2, 4: 1, 5: null });
	});

	it('records ancestor names and ids from the top down', () => {
		const infra = flattenTree(tree).find((row) => row.id === 3);
		expect(infra?.ancestors).toEqual(['Engineering', 'Platform']);
		expect(infra?.ancestorIds).toEqual([1, 2]);
	});

	it('keeps the active flag', () => {
		expect(flattenTree(tree).find((row) => row.id === 3)?.isActive).toBe(false);
	});

	it('returns an empty list for an empty tree', () => {
		expect(flattenTree([])).toEqual([]);
	});
});

describe('sortDepartments', () => {
	const rows = flattenTree(tree);

	it('sorts by level, then by name, for level-asc', () => {
		expect(sortDepartments(rows, 'level-asc').map((row) => row.name)).toEqual([
			'Engineering',
			'Finance',
			'Apps',
			'Platform',
			'Infra',
		]);
	});

	it('sorts the deepest first for level-desc', () => {
		expect(sortDepartments(rows, 'level-desc').map((row) => row.name)).toEqual([
			'Infra',
			'Apps',
			'Platform',
			'Engineering',
			'Finance',
		]);
	});

	it('sorts by name for name-asc and name-desc', () => {
		expect(sortDepartments(rows, 'name-asc').map((row) => row.name)).toEqual([
			'Apps',
			'Engineering',
			'Finance',
			'Infra',
			'Platform',
		]);
		expect(sortDepartments(rows, 'name-desc').map((row) => row.name)).toEqual([
			'Platform',
			'Infra',
			'Finance',
			'Engineering',
			'Apps',
		]);
	});

	it('ignores letter case and sorts numbers naturally', () => {
		const names = ['team 10', 'Team 2', 'team 1'].map(
			(name, index): FlatDepartment => ({
				id: index,
				name,
				parentId: null,
				isActive: true,
				level: 1,
				ancestors: [],
				ancestorIds: [],
			}),
		);
		expect(sortDepartments(names, 'name-asc').map((row) => row.name)).toEqual([
			'team 1',
			'Team 2',
			'team 10',
		]);
	});

	it('does not change the list it receives', () => {
		const before = rows.map((row) => row.id);
		sortDepartments(rows, 'name-desc');
		expect(rows.map((row) => row.id)).toEqual(before);
	});
});

describe('matchesSearch', () => {
	const infra = flattenTree(tree).find((row) => row.id === 3) as FlatDepartment;

	it('matches everything for empty or blank text', () => {
		expect(matchesSearch(infra, '')).toBe(true);
		expect(matchesSearch(infra, '   ')).toBe(true);
	});

	it('matches part of the name, ignoring case', () => {
		expect(matchesSearch(infra, 'INF')).toBe(true);
	});

	it('matches part of an ancestor name', () => {
		expect(matchesSearch(infra, 'platf')).toBe(true);
		expect(matchesSearch(infra, 'engineer')).toBe(true);
	});

	it('does not match unrelated text', () => {
		expect(matchesSearch(infra, 'finance')).toBe(false);
	});
});
