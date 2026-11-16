export interface Department {
	id: number;
	name: string;
	parentId: number | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface DepartmentChild {
	id: number;
	name: string;
	isActive: boolean;
}

export interface DepartmentDetail extends Department {
	children: DepartmentChild[];
	activeUserCount: number;
}

export interface DepartmentTreeNode {
	id: number;
	name: string;
	isActive: boolean;
	children: DepartmentTreeNode[];
}

export interface DepartmentListParams {
	isActive?: boolean;
	parentId?: number;
	topLevel?: boolean;
	search?: string;
	page?: number;
	pageSize?: number;
}

export interface DepartmentCreate {
	name: string;
	parentId?: number | null;
}

export interface DepartmentUpdate {
	name?: string;
	isActive?: boolean;
}

export interface MoveUsersResult {
	movedCount: number;
}
