import type { DepartmentTreeNode } from '../types/departments';

export interface FlatDepartment {
  id: number;
  name: string;
  parentId: number | null;
  isActive: boolean;
  level: number;
  ancestors: string[];
  ancestorIds: number[];
}

export function flattenTree(nodes: DepartmentTreeNode[]): FlatDepartment[] {
  const rows: FlatDepartment[] = [];

  function visit(
    node: DepartmentTreeNode,
    parentId: number | null,
    ancestors: string[],
    ancestorIds: number[],
  ) {
    rows.push({
      id: node.id,
      name: node.name,
      parentId,
      isActive: node.isActive,
      level: ancestors.length + 1,
      ancestors,
      ancestorIds,
    });
    for (const child of node.children) {
      visit(child, node.id, [...ancestors, node.name], [...ancestorIds, node.id]);
    }
  }

  for (const node of nodes) {
    visit(node, null, [], []);
  }
  return rows;
}

export type DepartmentSort = 'level-asc' | 'level-desc' | 'name-asc' | 'name-desc';

export const DEPARTMENT_SORT_OPTIONS: DepartmentSort[] = [
  'level-asc',
  'level-desc',
  'name-asc',
  'name-desc',
];

export const DEPARTMENT_SORT_LABELS: Record<DepartmentSort, string> = {
  'level-asc': 'Level: top level first',
  'level-desc': 'Level: deepest first',
  'name-asc': 'Name: A to Z',
  'name-desc': 'Name: Z to A',
};

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export function sortDepartments(rows: FlatDepartment[], sort: DepartmentSort): FlatDepartment[] {
  const byName = (a: FlatDepartment, b: FlatDepartment) => collator.compare(a.name, b.name);

  return [...rows].sort((a, b) => {
    switch (sort) {
      case 'name-asc':
        return byName(a, b);
      case 'name-desc':
        return byName(b, a);
      case 'level-asc':
        return a.level - b.level || byName(a, b);
      case 'level-desc':
        return b.level - a.level || byName(a, b);
    }
  });
}

export function matchesSearch(row: FlatDepartment, text: string): boolean {
  const query = text.trim().toLowerCase();
  if (!query) return true;
  return (
    row.name.toLowerCase().includes(query) ||
    row.ancestors.some((name) => name.toLowerCase().includes(query))
  );
}
