import { useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from '../api/departments';
import type { DepartmentCreate, DepartmentUpdate } from '../types/departments';
import { departmentKeys } from './useDepartments';

function useRefreshDepartments() {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: departmentKeys.all });
}

export function useCreateDepartment() {
	const refresh = useRefreshDepartments();
	return useMutation({
		mutationFn: (data: DepartmentCreate) => departmentsApi.create(data),
		onSuccess: refresh,
	});
}

export function useUpdateDepartment() {
	const refresh = useRefreshDepartments();
	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: DepartmentUpdate }) =>
			departmentsApi.update(id, data),
		onSuccess: refresh,
	});
}

export function useChangeDepartmentParent() {
	const refresh = useRefreshDepartments();
	return useMutation({
		mutationFn: ({ id, parentId }: { id: number; parentId: number | null }) =>
			departmentsApi.changeParent(id, parentId),
		onSuccess: refresh,
	});
}

export function useMoveDepartmentUsers() {
	const refresh = useRefreshDepartments();
	return useMutation({
		mutationFn: ({ id, targetDepartmentId }: { id: number; targetDepartmentId: number }) =>
			departmentsApi.moveUsers(id, targetDepartmentId),
		onSuccess: refresh,
	});
}
