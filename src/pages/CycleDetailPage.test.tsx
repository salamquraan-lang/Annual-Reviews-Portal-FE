import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { cyclesApi } from '../api/cycles';
import { makeCycle } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import type { CycleStatus } from '../types/cycles';
import { CycleDetailPage } from './CycleDetailPage';

vi.mock('../api/cycles');

function setup(route: string) {
	return {
		user: userEvent.setup(),
		...renderWithProviders(
			<Routes>
				<Route path="/cycles/:id" element={<CycleDetailPage />} />
				<Route path="/cycles" element={<p>Cycle list</p>} />
			</Routes>,
			route,
		),
	};
}

function loadCycle(status: CycleStatus, overrides = {}) {
	vi.mocked(cyclesApi.get).mockResolvedValue(makeCycle({ status, ...overrides }));
}

describe('CycleDetailPage', () => {
	beforeEach(() => {
		for (const fn of Object.values(cyclesApi)) vi.mocked(fn).mockReset();
		vi.mocked(cyclesApi.readiness).mockResolvedValue({ ready: true, problems: [] });
	});

	describe('loading and errors', () => {
		it('shows a loading message first', () => {
			vi.mocked(cyclesApi.get).mockReturnValue(new Promise(() => {}));
			setup('/cycles/1');
			expect(screen.getByText('Loading cycle…')).toBeInTheDocument();
		});

		it.each(['abc', '1.5', '-3', '0x10', '99999999999999999999'])(
			'shows not found for the id "%s" without calling the server',
			(id) => {
				setup(`/cycles/${id}`);
				expect(screen.getByRole('heading', { name: 'Cycle not found' })).toBeInTheDocument();
				expect(cyclesApi.get).not.toHaveBeenCalled();
			},
		);

		it('shows not found when the server says the cycle does not exist', async () => {
			vi.mocked(cyclesApi.get).mockRejectedValue(
				new ApiError(404, 'CYCLE_NOT_FOUND', 'Not found.'),
			);
			setup('/cycles/99999');
			expect(await screen.findByRole('heading', { name: 'Cycle not found' })).toBeInTheDocument();
			expect(screen.getByRole('link', { name: 'Back to cycles' })).toHaveAttribute('href', '/cycles');
		});

		it('shows the server message for other errors', async () => {
			vi.mocked(cyclesApi.get).mockRejectedValue(
				new ApiError(500, 'INTERNAL_ERROR', 'The server had a problem.'),
			);
			setup('/cycles/1');
			expect(await screen.findByText('The server had a problem.')).toBeInTheDocument();
		});
	});

	describe('content', () => {
		it('shows the name, the badge and the details', async () => {
			loadCycle('draft', { name: 'Annual 2026' });
			setup('/cycles/1');

			expect(await screen.findByRole('heading', { level: 1, name: 'Annual 2026' })).toBeInTheDocument();
			const details = screen.getByRole('heading', { name: 'Details' }).closest('section') as HTMLElement;
			expect(within(details).getByText('Annual')).toBeInTheDocument();
			expect(within(details).getByText('2026')).toBeInTheDocument();
			expect(within(details).getByText('1 Jan 2026')).toBeInTheDocument();
			expect(within(details).getByText('31 Dec 2026')).toBeInTheDocument();
		});

		it('asks the server for the cycle in the URL', async () => {
			loadCycle('draft');
			setup('/cycles/7');
			await screen.findByRole('heading', { level: 1 });
			expect(cyclesApi.get).toHaveBeenCalledWith(7);
		});
	});

	describe('what each status shows', () => {
		it('shows edit, copy, readiness, open and the danger zone for a draft', async () => {
			loadCycle('draft');
			setup('/cycles/1');

			expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Copy this cycle' })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Change end date' })).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Open cycle' })).toBeInTheDocument();
			expect(screen.getByRole('heading', { name: 'Readiness' })).toBeInTheDocument();
			expect(screen.getByRole('heading', { name: 'Danger zone' })).toBeInTheDocument();
		});

		it('shows change end date, copy and close for an open cycle', async () => {
			loadCycle('open');
			setup('/cycles/1');

			expect(await screen.findByRole('button', { name: 'Change end date' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Copy this cycle' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Close cycle' })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
			expect(screen.queryByRole('heading', { name: 'Readiness' })).not.toBeInTheDocument();
			expect(screen.queryByRole('heading', { name: 'Danger zone' })).not.toBeInTheDocument();
			expect(cyclesApi.readiness).not.toHaveBeenCalled();
		});

		it('shows reopen, finalize and copy for a closed cycle', async () => {
			loadCycle('closed');
			setup('/cycles/1');

			expect(await screen.findByRole('button', { name: 'Reopen cycle' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Finalize cycle' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Copy this cycle' })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
		});

		it('shows only copy for a finalized cycle', async () => {
			loadCycle('finalized');
			setup('/cycles/1');

			expect(await screen.findByRole('button', { name: 'Copy this cycle' })).toBeInTheDocument();
			expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
				'Copy this cycle',
			]);
		});
	});

	describe('dialogs', () => {
		it('opens the edit form with the cycle values', async () => {
			loadCycle('draft', { name: 'Annual 2026' });
			const { user } = setup('/cycles/1');

			await user.click(await screen.findByRole('button', { name: 'Edit' }));
			expect(screen.getByRole('heading', { name: 'Edit cycle' })).toBeInTheDocument();
			expect(screen.getByLabelText('Name')).toHaveValue('Annual 2026');
		});

		it('opens the end date form for an open cycle', async () => {
			loadCycle('open');
			const { user } = setup('/cycles/1');

			await user.click(await screen.findByRole('button', { name: 'Change end date' }));
			expect(screen.getByRole('heading', { name: 'Change end date' })).toBeInTheDocument();
		});

		it('copies a cycle and moves to the new draft', async () => {
			vi.mocked(cyclesApi.get).mockImplementation(async (id) =>
				id === 2
					? makeCycle({ id: 2, name: 'Annual 2027', year: 2027, status: 'draft' })
					: makeCycle({ id: 1, status: 'finalized' }),
			);
			vi.mocked(cyclesApi.copy).mockResolvedValue(makeCycle({ id: 2, name: 'Annual 2027' }));
			const { user } = setup('/cycles/1');

			await user.click(await screen.findByRole('button', { name: 'Copy this cycle' }));
			await user.click(screen.getByRole('button', { name: 'Create copy' }));

			await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/cycles/2'));
			expect(await screen.findByRole('heading', { level: 1, name: 'Annual 2027' })).toBeInTheDocument();
			expect(cyclesApi.copy).toHaveBeenCalledWith(1, expect.objectContaining({ year: 2027 }));
		});
	});
});
