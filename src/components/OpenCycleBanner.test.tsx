import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { cyclesApi } from '../api/cycles';
import type { Role } from '../types/auth';
import { makeCycle } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { OpenCycleBanner } from './OpenCycleBanner';

vi.mock('../api/cycles');

const auth = vi.hoisted(() => ({ role: 'admin' as Role }));

vi.mock('../auth/AuthContext', () => ({
	useAuth: () => ({ user: { id: 1, role: auth.role } }),
}));

describe('OpenCycleBanner', () => {
	beforeEach(() => {
		auth.role = 'admin';
		vi.mocked(cyclesApi.current).mockReset();
	});

	it('shows the open cycle with its dates', async () => {
		vi.mocked(cyclesApi.current).mockResolvedValue(makeCycle({ status: 'open' }));
		renderWithProviders(<OpenCycleBanner />);

		const banner = await screen.findByRole('status');
		expect(banner).toHaveTextContent('Open review cycle: Annual 2026 (Annual 2026), ends 31 Dec 2026.');
	});

	it('links to the cycle for an admin', async () => {
		vi.mocked(cyclesApi.current).mockResolvedValue(makeCycle({ id: 5, status: 'open' }));
		renderWithProviders(<OpenCycleBanner />);

		const link = await screen.findByRole('link', { name: 'View cycle' });
		expect(link).toHaveAttribute('href', '/cycles/5');
	});

	it('shows the banner without the link for other roles', async () => {
		auth.role = 'employee';
		vi.mocked(cyclesApi.current).mockResolvedValue(makeCycle({ status: 'open' }));
		renderWithProviders(<OpenCycleBanner />);

		await screen.findByRole('status');
		expect(screen.queryByRole('link', { name: 'View cycle' })).not.toBeInTheDocument();
	});

	it('shows nothing when no cycle is open', async () => {
		vi.mocked(cyclesApi.current).mockRejectedValue(
			new ApiError(404, 'NO_OPEN_CYCLE', 'No open cycle.'),
		);
		const { container } = renderWithProviders(<OpenCycleBanner />);

		await vi.waitFor(() => expect(cyclesApi.current).toHaveBeenCalled());
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
		expect(container.querySelector('.alert')).toBeNull();
	});

	it('shows nothing when loading fails', async () => {
		vi.mocked(cyclesApi.current).mockRejectedValue(
			new ApiError(500, 'INTERNAL_ERROR', 'The server had a problem.'),
		);
		renderWithProviders(<OpenCycleBanner />);

		await vi.waitFor(() => expect(cyclesApi.current).toHaveBeenCalled());
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
	});
});
