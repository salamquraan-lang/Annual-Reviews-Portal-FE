import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { cyclesApi } from '../api/cycles';
import { makeCycle } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import type { Cycle } from '../types/cycles';
import { CyclesPage } from './CyclesPage';

vi.mock('../api/cycles');

function pageOf(items: Cycle[], total = items.length, page = 1) {
	return { items, page, pageSize: 20, total };
}

function setup(route = '/cycles') {
	return { user: userEvent.setup(), ...renderWithProviders(<CyclesPage />, route) };
}

describe('CyclesPage', () => {
	beforeEach(() => {
		for (const fn of Object.values(cyclesApi)) vi.mocked(fn).mockReset();
	});

	it('shows a loading message first', () => {
		vi.mocked(cyclesApi.list).mockReturnValue(new Promise(() => {}));
		setup();
		expect(screen.getByText('Loading cycles…')).toBeInTheDocument();
	});

	it('lists the cycles with formatted dates, labels and a link to each', async () => {
		vi.mocked(cyclesApi.list).mockResolvedValue(
			pageOf([
				makeCycle({ id: 1, name: 'Annual 2026', status: 'open' }),
				makeCycle({ id: 2, name: 'Midyear 2026', type: 'midyear', startDate: '2026-06-01', endDate: '2026-06-30' }),
			]),
		);
		setup();

		const link = await screen.findByRole('link', { name: 'Annual 2026' });
		expect(link).toHaveAttribute('href', '/cycles/1');
		expect(screen.getByRole('link', { name: 'Midyear 2026' })).toHaveAttribute('href', '/cycles/2');

		const row = link.closest('tr') as HTMLElement;
		expect(within(row).getByText('Annual')).toBeInTheDocument();
		expect(within(row).getByText('2026')).toBeInTheDocument();
		expect(within(row).getByText('1 Jan 2026')).toBeInTheDocument();
		expect(within(row).getByText('31 Dec 2026')).toBeInTheDocument();
		expect(within(row).getByText('Open')).toBeInTheDocument();
		expect(screen.getByText('2 cycles')).toBeInTheDocument();
	});

	it('uses the singular for one cycle', async () => {
		vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([makeCycle()]));
		setup();
		expect(await screen.findByText('1 cycle')).toBeInTheDocument();
	});

	it('asks for the first page with 20 items by default', async () => {
		vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([]));
		setup();
		await waitFor(() =>
			expect(cyclesApi.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 }),
		);
	});

	it('shows an empty state with no filter button when there are no cycles', async () => {
		vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([]));
		setup();
		expect(
			await screen.findByText('No cycles yet. Create the first one with New cycle.'),
		).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
	});

	it('shows the server message when loading fails', async () => {
		vi.mocked(cyclesApi.list).mockRejectedValue(
			new ApiError(500, 'INTERNAL_ERROR', 'The server had a problem.'),
		);
		setup();
		expect(await screen.findByText('The server had a problem.')).toBeInTheDocument();
	});

	describe('filters', () => {
		it('reads the filters from the URL', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([]));
			setup('/cycles?status=closed&type=midyear&year=2025');

			await waitFor(() =>
				expect(cyclesApi.list).toHaveBeenCalledWith({
					status: 'closed',
					type: 'midyear',
					year: 2025,
					page: 1,
					pageSize: 20,
				}),
			);
			expect(screen.getByLabelText('Status')).toHaveValue('closed');
			expect(screen.getByLabelText('Type')).toHaveValue('midyear');
			expect(screen.getByLabelText('Year')).toHaveValue('2025');
		});

		it('ignores values in the URL that are not allowed', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([]));
			setup('/cycles?status=archived&year=abc&page=-1');

			await waitFor(() =>
				expect(cyclesApi.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 }),
			);
			expect(screen.getByLabelText('Status')).toHaveValue('');
		});

		it('puts the status in the URL and asks the server again', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([makeCycle()]));
			const { user } = setup();
			await screen.findByRole('link', { name: 'Annual 2026' });

			await user.selectOptions(screen.getByLabelText('Status'), 'open');

			await waitFor(() =>
				expect(screen.getByTestId('location')).toHaveTextContent('/cycles?status=open'),
			);
			await waitFor(() =>
				expect(cyclesApi.list).toHaveBeenLastCalledWith({ status: 'open', page: 1, pageSize: 20 }),
			);
		});

		it('puts the type in the URL', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([]));
			const { user } = setup();
			await user.selectOptions(screen.getByLabelText('Type'), 'midyear');

			await waitFor(() =>
				expect(screen.getByTestId('location')).toHaveTextContent('/cycles?type=midyear'),
			);
		});

		it('puts a complete year in the URL, but not a partial one', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([]));
			const { user } = setup();

			await user.type(screen.getByLabelText('Year'), '202');
			expect(screen.getByTestId('location')).toHaveTextContent(/^\/cycles$/);

			await user.type(screen.getByLabelText('Year'), '6');
			await waitFor(() =>
				expect(screen.getByTestId('location')).toHaveTextContent('/cycles?year=2026'),
			);
		});

		it('shows the filtered count and an empty state that can clear the filters', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([]));
			const { user } = setup('/cycles?status=open');

			expect(await screen.findByText('No cycles match your filters.')).toBeInTheDocument();
			expect(screen.getByText('0 cycles match your filters')).toBeInTheDocument();

			const clear = screen.getAllByRole('button', { name: 'Clear filters' });
			await user.click(clear[clear.length - 1]);
			await waitFor(() =>
				expect(screen.getByTestId('location')).toHaveTextContent(/^\/cycles$/),
			);
			expect(screen.getByLabelText('Status')).toHaveValue('');
		});

		it('only shows Clear filters when a filter is active', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([makeCycle()]));
			setup();
			await screen.findByRole('link', { name: 'Annual 2026' });
			expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
		});

		it('goes back to the first page when a filter changes', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([makeCycle()], 45, 3));
			const { user } = setup('/cycles?page=3');
			await screen.findByRole('link', { name: 'Annual 2026' });

			await user.selectOptions(screen.getByLabelText('Status'), 'draft');
			await waitFor(() =>
				expect(screen.getByTestId('location')).toHaveTextContent(/^\/cycles\?status=draft$/),
			);
		});
	});

	describe('pagination', () => {
		it('does not show pagination for 20 cycles or fewer', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([makeCycle()], 20));
			setup();
			await screen.findByRole('link', { name: 'Annual 2026' });
			expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
		});

		it('shows pagination for more than 20 cycles and moves to the next page', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([makeCycle()], 45));
			const { user } = setup();

			expect(await screen.findByText('Page 1 of 3 · 45 total')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

			await user.click(screen.getByRole('button', { name: 'Next' }));
			await waitFor(() =>
				expect(screen.getByTestId('location')).toHaveTextContent('/cycles?page=2'),
			);
			await waitFor(() =>
				expect(cyclesApi.list).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 }),
			);
		});

		it('removes the page from the URL when going back to page 1', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([makeCycle()], 45, 2));
			const { user } = setup('/cycles?page=2');

			await screen.findByText('Page 2 of 3 · 45 total');
			await user.click(screen.getByRole('button', { name: 'Previous' }));
			await waitFor(() =>
				expect(screen.getByTestId('location')).toHaveTextContent(/^\/cycles$/),
			);
		});

		it('offers a way back when the page is past the end', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([], 45, 9));
			const { user } = setup('/cycles?page=9');

			expect(await screen.findByText('This page is empty.')).toBeInTheDocument();
			await user.click(screen.getByRole('button', { name: 'Go to the first page' }));
			await waitFor(() =>
				expect(screen.getByTestId('location')).toHaveTextContent(/^\/cycles$/),
			);
		});
	});

	describe('creating', () => {
		it('opens the form from New cycle and closes it again', async () => {
			vi.mocked(cyclesApi.list).mockResolvedValue(pageOf([]));
			const { user } = setup();
			await screen.findByText('No cycles yet. Create the first one with New cycle.');

			await user.click(screen.getByRole('button', { name: 'New cycle' }));
			expect(screen.getByRole('heading', { name: 'New cycle' })).toBeInTheDocument();

			await user.click(screen.getByRole('button', { name: 'Cancel' }));
			expect(screen.queryByRole('heading', { name: 'New cycle' })).not.toBeInTheDocument();
		});
	});
});
