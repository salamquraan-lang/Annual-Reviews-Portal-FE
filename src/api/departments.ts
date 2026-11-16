import { request } from './client';
import { toQuery } from './query';
import type { Page } from '../types/common';
import type {
	Department,
	DepartmentCreate,
	DepartmentDetail,
	DepartmentListParams,
	DepartmentTreeNode,
	DepartmentUpdate,
	MoveUsersResult,
} from '../types/departments';

export const departmentsApi = {
	list: (params: DepartmentListParams = {}) =>
		request<Page<Department>>('GET', `/departments${toQuery(params)}`, undefined, { auth: true }),
	tree: () => request<DepartmentTreeNode[]>('GET', '/departments/tree', undefined, { auth: true }),
	get: (id: number) => request<DepartmentDetail>('GET', `/departments/${id}`, undefined, { auth: true }),
	create: (data: DepartmentCreate) => request<Department>('POST', '/departments', data, { auth: true }),
	update: (id: number, data: DepartmentUpdate) =>
		request<Department>('PATCH', `/departments/${id}`, data, { auth: true }),
	changeParent: (id: number, parentId: number | null) =>
		request<Department>('PUT', `/departments/${id}/parent`, { parentId }, { auth: true }),
	moveUsers: (id: number, targetDepartmentId: number) =>
		request<MoveUsersResult>('POST', `/departments/${id}/move-users`, { targetDepartmentId }, { auth: true }),
};
