import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { departmentsApi } from '../api/departments';
import type { DepartmentListParams } from '../types/departments';

export const departmentKeys = {
	all: ['departments'] as const,
	list: (params: DepartmentListParams) =>
		[...departmentKeys.all, 'list', params] as const,
	tree: () => [...departmentKeys.all, 'tree'] as const,
};

export function useDepartments(params: DepartmentListParams) {
	return useQuery({
		queryKey: departmentKeys.list(params),
		queryFn: () => departmentsApi.list(params),
		placeholderData: keepPreviousData,
	});
}

export function useDepartmentTree() {
	return useQuery({
		queryKey: departmentKeys.tree(),
		queryFn: () => departmentsApi.tree(),
	});
}
