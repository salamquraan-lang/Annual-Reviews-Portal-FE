import { useMemo } from 'react';
import { flattenTree } from '../utils/departments';
import { useDepartmentTree } from './useDepartments';

export function useDepartmentRows() {
  const { data, isPending, isError, error } = useDepartmentTree();
  const rows = useMemo(() => (data ? flattenTree(data) : []), [data]);
  return { rows, isPending, isError, error };
}
