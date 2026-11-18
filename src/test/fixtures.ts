import type { Cycle } from '../types/cycles';
import type { DepartmentTreeNode } from '../types/departments';
import type { FlatDepartment } from '../utils/departments';

export function makeCycle(overrides: Partial<Cycle> = {}): Cycle {
	return {
		id: 1,
		name: 'Annual 2026',
		type: 'annual',
		year: 2026,
		startDate: '2026-01-01',
		endDate: '2026-12-31',
		status: 'draft',
		...overrides,
	};
}

export function makeDepartmentNode(
	id: number,
	name: string,
	children: DepartmentTreeNode[] = [],
	isActive = true,
): DepartmentTreeNode {
	return { id, name, isActive, children };
}

export function makeFlatDepartment(overrides: Partial<FlatDepartment> = {}): FlatDepartment {
	return {
		id: 1,
		name: 'Engineering',
		parentId: null,
		isActive: true,
		level: 1,
		ancestors: [],
		ancestorIds: [],
		...overrides,
	};
}
