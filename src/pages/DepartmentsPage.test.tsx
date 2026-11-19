import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { departmentsApi } from '../api/departments';
import { makeDepartmentNode } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import type { Role } from '../types/auth';
import { DepartmentsPage } from './DepartmentsPage';

vi.mock('../api/departments');

const auth = vi.hoisted(() => ({ role: 'super_admin' as Role }));

vi.mock('../auth/AuthContext', () => ({
	useAuth: () => ({ user: { id: 1, role: auth.role } }),
}));

const tree = [
	makeDepartmentNode(1, 'Engineering', [makeDepartmentNode(2, 'Platform')]),
	makeDepartmentNode(3, 'Finance', [], false),
];

function rowNames() {
	const body = screen.getAllByRole('rowgroup')[1];
	return within(body)
		.getAllByRole('row')
		.map((row) => within(row).getAllByRole('cell')[0].textContent);
}

describe('DepartmentsPage', () => {
	beforeEach(() => {
		auth.role = 'super_admin';
		vi.mocked(departmentsApi.tree).mockReset();
		vi.mocked(departmentsApi.tree).mockResolvedValue(tree);
	});

	it('lists every department with its level, parent and status', async () => {
		renderWithProviders(<DepartmentsPage />);

		expect(await screen.findByText('3 departments')).toBeInTheDocument();
		const platform = screen.getByText('Platform').closest('tr') as HTMLElement;
		expect(within(platform).getByText('Level 2')).toBeInTheDocument();
		expect(within(platform).getByText('Engineering')).toBeInTheDocument();
		expect(within(platform).getByText('Active')).toBeInTheDocument();

		const finance = screen.getByText('Finance').closest('tr') as HTMLElement;
		expect(within(finance).getByText('Inactive')).toBeInTheDocument();
	});

	it('lets a super admin create and change departments', async () => {
		renderWithProviders(<DepartmentsPage />);
		await screen.findByText('3 departments');

		expect(screen.getByRole('button', { name: 'New department' })).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(3);
		expect(screen.getAllByRole('button', { name: 'Change parent' })).toHaveLength(3);
		expect(screen.getAllByRole('button', { name: 'Move users' })).toHaveLength(3);
	});

	it('lets an admin only read', async () => {
		auth.role = 'admin';
		renderWithProviders(<DepartmentsPage />);
		await screen.findByText('3 departments');

		expect(screen.queryByRole('button', { name: 'New department' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
		expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
	});

	it('filters by search text, including the parent name', async () => {
		const user = userEvent.setup();
		renderWithProviders(<DepartmentsPage />);
		await screen.findByText('3 departments');

		await user.type(screen.getByLabelText('Search departments'), 'engineer');

		expect(rowNames()).toEqual(['Engineering', 'Platform']);
		expect(screen.getByText('Showing 2 of 3 departments')).toBeInTheDocument();
	});

	it('filters by status', async () => {
		const user = userEvent.setup();
		renderWithProviders(<DepartmentsPage />);
		await screen.findByText('3 departments');

		await user.selectOptions(screen.getByLabelText('Status'), 'inactive');
		expect(rowNames()).toEqual(['Finance']);
	});

	it('sorts by name', async () => {
		const user = userEvent.setup();
		renderWithProviders(<DepartmentsPage />);
		await screen.findByText('3 departments');

		await user.selectOptions(screen.getByLabelText('Sort by'), 'name-desc');
		expect(rowNames()).toEqual(['Platform', 'Finance', 'Engineering']);
	});

	it('shows an empty message with a way to clear the filters', async () => {
		const user = userEvent.setup();
		renderWithProviders(<DepartmentsPage />);
		await screen.findByText('3 departments');

		await user.type(screen.getByLabelText('Search departments'), 'zzz');
		expect(screen.getByText('No departments match your filters.')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Clear filters' }));
		expect(rowNames()).toHaveLength(3);
	});

	it('shows the first-department message when there are none', async () => {
		vi.mocked(departmentsApi.tree).mockResolvedValue([]);
		renderWithProviders(<DepartmentsPage />);

		expect(
			await screen.findByText('No departments yet. Create the first one with New department.'),
		).toBeInTheDocument();
	});

	it('does not tell an admin to create a department', async () => {
		auth.role = 'admin';
		vi.mocked(departmentsApi.tree).mockResolvedValue([]);
		renderWithProviders(<DepartmentsPage />);

		expect(await screen.findByText('No departments yet.')).toBeInTheDocument();
	});

	it('switches to the tree view', async () => {
		const user = userEvent.setup();
		renderWithProviders(<DepartmentsPage />);
		await screen.findByText('3 departments');

		await user.click(screen.getByRole('button', { name: 'Tree' }));
		expect(screen.queryByRole('table')).not.toBeInTheDocument();
		expect(await screen.findByText('Engineering')).toBeInTheDocument();
		expect(screen.getByText('Inactive')).toBeInTheDocument();
	});

	it('opens the create form', async () => {
		const user = userEvent.setup();
		renderWithProviders(<DepartmentsPage />);
		await screen.findByText('3 departments');

		await user.click(screen.getByRole('button', { name: 'New department' }));
		expect(screen.getByRole('heading', { name: 'New department' })).toBeInTheDocument();
	});
});
