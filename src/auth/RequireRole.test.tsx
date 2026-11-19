import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '../types/auth';
import { RequireRole } from './RequireRole';

const auth = vi.hoisted(() => ({ user: null as { role: Role } | null }));

vi.mock('./AuthContext', () => ({
	useAuth: () => ({ user: auth.user }),
}));

function setup(roles: Role[]) {
	render(
		<MemoryRouter>
			<RequireRole roles={roles}>
				<p>Secret page</p>
			</RequireRole>
		</MemoryRouter>,
	);
}

describe('RequireRole', () => {
	beforeEach(() => {
		auth.user = null;
	});

	it('shows the page to a user whose role is allowed', () => {
		auth.user = { role: 'admin' };
		setup(['admin']);
		expect(screen.getByText('Secret page')).toBeInTheDocument();
	});

	it('allows any role in the list', () => {
		auth.user = { role: 'super_admin' };
		setup(['admin', 'super_admin']);
		expect(screen.getByText('Secret page')).toBeInTheDocument();
	});

	it.each<Role>(['employee', 'manager', 'super_admin'])(
		'blocks the role %s when only admin is allowed',
		(role) => {
			auth.user = { role };
			setup(['admin']);

			expect(screen.queryByText('Secret page')).not.toBeInTheDocument();
			expect(screen.getByRole('heading', { name: "You can't open this page" })).toBeInTheDocument();
			expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/');
		},
	);

	it('shows nothing when there is no user', () => {
		setup(['admin']);
		expect(screen.queryByText('Secret page')).not.toBeInTheDocument();
		expect(screen.queryByRole('heading')).not.toBeInTheDocument();
	});
});
