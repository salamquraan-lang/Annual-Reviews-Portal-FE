import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { departmentsApi } from '../api/departments';
import { makeDepartmentNode, makeFlatDepartment } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { ChangeParentModal } from './ChangeParentModal';
import { CreateDepartmentModal } from './CreateDepartmentModal';
import { EditDepartmentModal } from './EditDepartmentModal';
import { MoveUsersModal } from './MoveUsersModal';

vi.mock('../api/departments');

const department = makeFlatDepartment({ id: 1, name: 'Engineering' });

const tree = [
	makeDepartmentNode(1, 'Engineering', [makeDepartmentNode(2, 'Platform')]),
	makeDepartmentNode(3, 'Finance'),
	makeDepartmentNode(4, 'Legacy', [], false),
];

type User = ReturnType<typeof userEvent.setup>;

async function pick(user: User, label: string, optionName: string) {
	await screen.findByRole('option', { name: optionName });
	await user.selectOptions(screen.getByLabelText(label), optionName);
}

function department404() {
	return new ApiError(404, 'DEPARTMENT_NOT_FOUND', 'Not found.');
}

describe('department modals', () => {
	beforeEach(() => {
		for (const fn of Object.values(departmentsApi)) vi.mocked(fn).mockReset();
		vi.mocked(departmentsApi.tree).mockResolvedValue(tree);
	});

	describe('EditDepartmentModal', () => {
		function setup() {
			const onClose = vi.fn();
			renderWithProviders(<EditDepartmentModal department={department} onClose={onClose} />);
			return { onClose, user: userEvent.setup() };
		}

		it('starts with the name and the active flag of the department', () => {
			setup();
			expect(screen.getByLabelText('Name')).toHaveValue('Engineering');
			expect(screen.getByLabelText('Active')).toBeChecked();
		});

		it('requires a name', async () => {
			const { user } = setup();
			await user.clear(screen.getByLabelText('Name'));
			await user.click(screen.getByRole('button', { name: 'Save' }));

			expect(await screen.findByText('Enter a department name.')).toBeInTheDocument();
			expect(departmentsApi.update).not.toHaveBeenCalled();
		});

		it('closes without a request when nothing changed', async () => {
			const { onClose, user } = setup();
			await user.click(screen.getByRole('button', { name: 'Save' }));

			expect(onClose).toHaveBeenCalledTimes(1);
			expect(departmentsApi.update).not.toHaveBeenCalled();
		});

		it('sends only the name when only the name changed', async () => {
			vi.mocked(departmentsApi.update).mockResolvedValue({} as never);
			const { onClose, user } = setup();
			await user.clear(screen.getByLabelText('Name'));
			await user.type(screen.getByLabelText('Name'), '  Product  ');
			await user.click(screen.getByRole('button', { name: 'Save' }));

			await waitFor(() => expect(departmentsApi.update).toHaveBeenCalledWith(1, { name: 'Product' }));
			await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		});

		it('sends only the active flag when only it changed', async () => {
			vi.mocked(departmentsApi.update).mockResolvedValue({} as never);
			const { user } = setup();
			await user.click(screen.getByLabelText('Active'));
			await user.click(screen.getByRole('button', { name: 'Save' }));

			await waitFor(() => expect(departmentsApi.update).toHaveBeenCalledWith(1, { isActive: false }));
		});

		it.each([
			['DEPARTMENT_NAME_TAKEN', 'A department with this name already exists.'],
			[
				'DEPARTMENT_HAS_ACTIVE_USERS',
				'This department still has active users. Move them to another department first.',
			],
			[
				'DEPARTMENT_HAS_ACTIVE_CHILDREN',
				'This department still has active sub-departments. Deactivate them first.',
			],
			[
				'DEPARTMENT_PARENT_INACTIVE',
				'The parent department is inactive. Activate the parent first.',
			],
			[
				'DEPARTMENT_NOT_FOUND',
				'This department no longer exists. Close this form and refresh the list.',
			],
		])('explains the error %s', async (code, message) => {
			vi.mocked(departmentsApi.update).mockRejectedValue(new ApiError(409, code, 'Server text.'));
			const { onClose, user } = setup();
			await user.type(screen.getByLabelText('Name'), '2');
			await user.click(screen.getByRole('button', { name: 'Save' }));

			expect(await screen.findByText(message)).toBeInTheDocument();
			expect(onClose).not.toHaveBeenCalled();
		});

		it('shows the server message for unknown errors', async () => {
			vi.mocked(departmentsApi.update).mockRejectedValue(
				new ApiError(500, 'INTERNAL_ERROR', 'The server had a problem.'),
			);
			const { user } = setup();
			await user.type(screen.getByLabelText('Name'), '2');
			await user.click(screen.getByRole('button', { name: 'Save' }));

			expect(await screen.findByText('The server had a problem.')).toBeInTheDocument();
		});
	});

	describe('CreateDepartmentModal', () => {
		function setup() {
			const onClose = vi.fn();
			renderWithProviders(<CreateDepartmentModal onClose={onClose} />);
			return { onClose, user: userEvent.setup() };
		}

		it('requires a name', async () => {
			const { user } = setup();
			await user.type(screen.getByLabelText('Name'), '   ');
			await user.click(screen.getByRole('button', { name: 'Create' }));

			expect(await screen.findByText('Enter a department name.')).toBeInTheDocument();
			expect(departmentsApi.create).not.toHaveBeenCalled();
		});

		it('creates a top level department with a trimmed name', async () => {
			vi.mocked(departmentsApi.create).mockResolvedValue({} as never);
			const { onClose, user } = setup();
			await user.type(screen.getByLabelText('Name'), '  Legal ');
			await user.click(screen.getByRole('button', { name: 'Create' }));

			await waitFor(() =>
				expect(departmentsApi.create).toHaveBeenCalledWith({ name: 'Legal', parentId: null }),
			);
			await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		});

		it('creates a department under the chosen parent', async () => {
			vi.mocked(departmentsApi.create).mockResolvedValue({} as never);
			const { user } = setup();
			await user.type(screen.getByLabelText('Name'), 'Legal');
			await pick(user, 'Parent department', 'Finance');
			await user.click(screen.getByRole('button', { name: 'Create' }));

			await waitFor(() =>
				expect(departmentsApi.create).toHaveBeenCalledWith({ name: 'Legal', parentId: 3 }),
			);
		});

		it('shows a taken name under the field', async () => {
			vi.mocked(departmentsApi.create).mockRejectedValue(
				new ApiError(409, 'DEPARTMENT_NAME_TAKEN', 'Taken.'),
			);
			const { onClose, user } = setup();
			await user.type(screen.getByLabelText('Name'), 'Finance');
			await user.click(screen.getByRole('button', { name: 'Create' }));

			expect(await screen.findByText('A department with this name already exists.')).toBeInTheDocument();
			expect(onClose).not.toHaveBeenCalled();
		});

		it('says when the parent is inactive', async () => {
			vi.mocked(departmentsApi.create).mockRejectedValue(
				new ApiError(409, 'DEPARTMENT_PARENT_INACTIVE', 'Inactive.'),
			);
			const { user } = setup();
			await user.type(screen.getByLabelText('Name'), 'Legal');
			await user.click(screen.getByRole('button', { name: 'Create' }));

			expect(await screen.findByText('The selected parent department is inactive.')).toBeInTheDocument();
		});
	});

	describe('ChangeParentModal', () => {
		const child = makeFlatDepartment({
			id: 2,
			name: 'Platform',
			parentId: 1,
			level: 2,
			ancestors: ['Engineering'],
			ancestorIds: [1],
		});

		function setup() {
			const onClose = vi.fn();
			renderWithProviders(<ChangeParentModal department={child} onClose={onClose} />);
			return { onClose, user: userEvent.setup() };
		}

		it('closes without a request when the parent is unchanged', async () => {
			const { onClose, user } = setup();
			await screen.findByRole('option', { name: 'Finance' });
			await user.click(screen.getByRole('button', { name: 'Save' }));

			expect(onClose).toHaveBeenCalledTimes(1);
			expect(departmentsApi.changeParent).not.toHaveBeenCalled();
		});

		it('moves the department under another parent', async () => {
			vi.mocked(departmentsApi.changeParent).mockResolvedValue({} as never);
			const { onClose, user } = setup();
			await pick(user, 'Parent department', 'Finance');
			await user.click(screen.getByRole('button', { name: 'Save' }));

			await waitFor(() => expect(departmentsApi.changeParent).toHaveBeenCalledWith(2, 3));
			await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		});

		it('can move the department to the top level', async () => {
			vi.mocked(departmentsApi.changeParent).mockResolvedValue({} as never);
			const { user } = setup();
			await pick(user, 'Parent department', 'No parent (top level)');
			await user.click(screen.getByRole('button', { name: 'Save' }));

			await waitFor(() => expect(departmentsApi.changeParent).toHaveBeenCalledWith(2, null));
		});

		it('does not offer the department itself or inactive departments as a parent', async () => {
			setup();
			await screen.findByRole('option', { name: 'Finance' });
			expect(screen.queryByRole('option', { name: 'Platform' })).not.toBeInTheDocument();
			expect(screen.queryByRole('option', { name: 'Legacy' })).not.toBeInTheDocument();
		});

		it('explains a loop', async () => {
			vi.mocked(departmentsApi.changeParent).mockRejectedValue(
				new ApiError(409, 'DEPARTMENT_LOOP', 'Loop.'),
			);
			const { user } = setup();
			await pick(user, 'Parent department', 'Finance');
			await user.click(screen.getByRole('button', { name: 'Save' }));

			expect(
				await screen.findByText(
					'A department cannot be placed under itself or one of its own sub-departments.',
				),
			).toBeInTheDocument();
		});

		it('says when the department no longer exists', async () => {
			vi.mocked(departmentsApi.changeParent).mockRejectedValue(department404());
			const { user } = setup();
			await pick(user, 'Parent department', 'Finance');
			await user.click(screen.getByRole('button', { name: 'Save' }));

			expect(
				await screen.findByText('This department no longer exists. Close this form and refresh the list.'),
			).toBeInTheDocument();
		});
	});

	describe('MoveUsersModal', () => {
		function setup() {
			const onClose = vi.fn();
			renderWithProviders(<MoveUsersModal department={department} onClose={onClose} />);
			return { onClose, user: userEvent.setup() };
		}

		it('asks for a target department first', async () => {
			const { user } = setup();
			await screen.findByRole('option', { name: 'Finance' });
			await user.click(screen.getByRole('button', { name: 'Move users' }));

			expect(await screen.findByText('Choose the department to move the users to.')).toBeInTheDocument();
			expect(departmentsApi.moveUsers).not.toHaveBeenCalled();
		});

		it('moves the users and shows how many were moved', async () => {
			vi.mocked(departmentsApi.moveUsers).mockResolvedValue({ movedCount: 3 });
			const { user } = setup();
			await pick(user, 'Move users to', 'Finance');
			await user.click(screen.getByRole('button', { name: 'Move users' }));

			expect(await screen.findByText('3 users were moved.')).toBeInTheDocument();
			expect(departmentsApi.moveUsers).toHaveBeenCalledWith(1, 3);
		});

		it('uses the singular for one user', async () => {
			vi.mocked(departmentsApi.moveUsers).mockResolvedValue({ movedCount: 1 });
			const { user } = setup();
			await pick(user, 'Move users to', 'Finance');
			await user.click(screen.getByRole('button', { name: 'Move users' }));

			expect(await screen.findByText('1 user was moved.')).toBeInTheDocument();
		});

		it('says when there were no users to move', async () => {
			vi.mocked(departmentsApi.moveUsers).mockResolvedValue({ movedCount: 0 });
			const { user } = setup();
			await pick(user, 'Move users to', 'Finance');
			await user.click(screen.getByRole('button', { name: 'Move users' }));

			expect(await screen.findByText('There were no users to move.')).toBeInTheDocument();
		});

		it('explains when the target no longer exists', async () => {
			vi.mocked(departmentsApi.moveUsers).mockRejectedValue(
				new ApiError(404, 'TARGET_NOT_FOUND', 'Gone.'),
			);
			const { user } = setup();
			await pick(user, 'Move users to', 'Finance');
			await user.click(screen.getByRole('button', { name: 'Move users' }));

			expect(
				await screen.findByText('The selected department no longer exists. Close this form and try again.'),
			).toBeInTheDocument();
		});
	});
});
