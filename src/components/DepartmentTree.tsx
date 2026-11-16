import { useDepartmentTree } from '../hooks/useDepartments';
import type { DepartmentTreeNode } from '../types/departments';
import { Badge } from './Badge';

interface TreeNodeProps {
	node: DepartmentTreeNode;
}

function TreeNode({ node }: TreeNodeProps) {
	const label = (
		<span className="tree__label">
			{node.name}
			{!node.isActive && <Badge tone="neutral">Inactive</Badge>}
		</span>
	);

	if (node.children.length === 0) {
		return <li className="tree__item tree__item--leaf">{label}</li>;
	}

	return (
		<li className="tree__item">
			<details open>
				<summary>{label}</summary>
				<ul className="tree">
					{node.children.map((child) => (
						<TreeNode key={child.id} node={child} />
					))}
				</ul>
			</details>
		</li>
	);
}

export function DepartmentTree() {
	const { data, isPending, isError } = useDepartmentTree();

	if (isPending) return <p className="state-message">Loading departments…</p>;
	if (isError) {
		return <p className="state-message state-message--error">Could not load the department tree.</p>;
	}
	if (data.length === 0) return <p className="state-message">No departments yet.</p>;

	return (
		<ul className="tree tree--root">
			{data.map((node) => (
				<TreeNode key={node.id} node={node} />
			))}
		</ul>
	);
}
