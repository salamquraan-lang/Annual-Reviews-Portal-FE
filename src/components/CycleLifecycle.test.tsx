import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { cyclesApi } from '../api/cycles';
import { makeCycle } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import type { CycleStatus } from '../types/cycles';
import { CycleLifecycle } from './CycleLifecycle';

vi.mock('../api/cycles');

function setup(status: CycleStatus) {
	const cycle = makeCycle({ status });
	renderWithProviders(<CycleLifecycle cycle={cycle} />, '/cycles/1');
	return { cycle, user: userEvent.setup() };
}

function dialog() {
	return screen.getByRole('dialog');
}

describe('CycleLifecycle', () => {
	beforeEach(() => {
		for (const fn of Object.values(cyclesApi)) vi.mocked(fn).mockReset();
	});

	describe('buttons by status', () => {
		it('offers only Open on a draft', () => {
			setup('draft');
			expect(screen.getByRole('button', { name: 'Open cycle' })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Close cycle' })).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Reopen cycle' })).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Finalize cycle' })).not.toBeInTheDocument();
		});

		it('offers only Close on an open cycle', () => {
			setup('open');
			expect(screen.getByRole('button', { name: 'Close cycle' })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Open cycle' })).not.toBeInTheDocument();
		});

		it('offers Reopen and Finalize on a closed cycle', () => {
			setup('closed');
			expect(screen.getByRole('button', { name: 'Reopen cycle' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Finalize cycle' })).toBeInTheDocument();
		});

		it('offers no action on a finalized cycle', () => {
			setup('finalized');
			expect(screen.queryByRole('button')).not.toBeInTheDocument();
		});
	});

	describe('progress strip', () => {
		it('marks the current step and the steps before it', () => {
			setup('closed');
			const steps = screen.getAllByRole('listitem');
			expect(steps.map((step) => step.textContent)).toEqual([
				'Draft',
				'Open',
				'Closed',
				'Finalized',
			]);
			expect(steps[2]).toHaveAttribute('aria-current', 'step');
			expect(steps[0]).toHaveClass('lifecycle__step--done');
			expect(steps[1]).toHaveClass('lifecycle__step--done');
			expect(steps[3]).not.toHaveClass('lifecycle__step--done');
			expect(steps[3]).not.toHaveAttribute('aria-current');
		});
	});

	describe('opening', () => {
		it('asks first, then opens the cycle and closes the dialog', async () => {
			vi.mocked(cyclesApi.open).mockResolvedValue(makeCycle({ status: 'open' }));
			const { user } = setup('draft');

			await user.click(screen.getByRole('button', { name: 'Open cycle' }));
			expect(cyclesApi.open).not.toHaveBeenCalled();
			expect(within(dialog()).getByText('Open this cycle?')).toBeInTheDocument();

			await user.click(within(dialog()).getByRole('button', { name: 'Open cycle' }));
			await waitFor(() => expect(cyclesApi.open).toHaveBeenCalledWith(1));
			await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		});

		it('does nothing when the dialog is cancelled', async () => {
			const { user } = setup('draft');
			await user.click(screen.getByRole('button', { name: 'Open cycle' }));
			await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));

			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			expect(cyclesApi.open).not.toHaveBeenCalled();
		});

		it('shows a link when another cycle is already open', async () => {
			vi.mocked(cyclesApi.open).mockRejectedValue(
				new ApiError(409, 'ANOTHER_CYCLE_OPEN', 'Another cycle is open.'),
			);
			const { user } = setup('draft');
			await user.click(screen.getByRole('button', { name: 'Open cycle' }));
			await user.click(within(dialog()).getByRole('button', { name: 'Open cycle' }));

			const alert = await within(dialog()).findByRole('alert');
			expect(alert).toHaveTextContent('Another cycle is already open. Close it first.');
			expect(within(alert).getByRole('link', { name: 'Show the open cycle' })).toHaveAttribute(
				'href',
				'/cycles?status=open',
			);
			expect(dialog()).toBeInTheDocument();
		});

		it('lists the problems when the cycle is not ready', async () => {
			vi.mocked(cyclesApi.open).mockRejectedValue(
				new ApiError(422, 'CYCLE_NOT_READY', 'Not ready.', [
					{ field: 'templates', message: 'The manager template is missing.' },
					{ field: 'bands', message: 'No reward bands.' },
				]),
			);
			const { user } = setup('draft');
			await user.click(screen.getByRole('button', { name: 'Open cycle' }));
			await user.click(within(dialog()).getByRole('button', { name: 'Open cycle' }));

			const alert = await within(dialog()).findByRole('alert');
			expect(alert).toHaveTextContent('The cycle is not ready to open.');
			expect(within(alert).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
				'The manager template is missing.',
				'No reward bands.',
			]);
		});

		it('says the action no longer fits when the status changed', async () => {
			vi.mocked(cyclesApi.open).mockRejectedValue(
				new ApiError(409, 'CYCLE_INVALID_STATUS', 'Wrong status.'),
			);
			const { user } = setup('draft');
			await user.click(screen.getByRole('button', { name: 'Open cycle' }));
			await user.click(within(dialog()).getByRole('button', { name: 'Open cycle' }));

			expect(await within(dialog()).findByRole('alert')).toHaveTextContent(
				"This action no longer fits the cycle's status. The page was refreshed.",
			);
		});

		it('links back to the list when the cycle no longer exists', async () => {
			vi.mocked(cyclesApi.open).mockRejectedValue(
				new ApiError(404, 'CYCLE_NOT_FOUND', 'Not found.'),
			);
			const { user } = setup('draft');
			await user.click(screen.getByRole('button', { name: 'Open cycle' }));
			await user.click(within(dialog()).getByRole('button', { name: 'Open cycle' }));

			const alert = await within(dialog()).findByRole('alert');
			expect(within(alert).getByRole('link', { name: 'Back to cycles' })).toHaveAttribute(
				'href',
				'/cycles',
			);
		});

		it('shows the server message for other errors', async () => {
			vi.mocked(cyclesApi.open).mockRejectedValue(
				new ApiError(500, 'INTERNAL_ERROR', 'The server had a problem.'),
			);
			const { user } = setup('draft');
			await user.click(screen.getByRole('button', { name: 'Open cycle' }));
			await user.click(within(dialog()).getByRole('button', { name: 'Open cycle' }));

			expect(await within(dialog()).findByRole('alert')).toHaveTextContent(
				'The server had a problem.',
			);
		});

		it('shows a general message when the failure is not an API error', async () => {
			vi.mocked(cyclesApi.open).mockRejectedValue(new Error('boom'));
			const { user } = setup('draft');
			await user.click(screen.getByRole('button', { name: 'Open cycle' }));
			await user.click(within(dialog()).getByRole('button', { name: 'Open cycle' }));

			expect(await within(dialog()).findByRole('alert')).toHaveTextContent(
				'Something went wrong. Please try again.',
			);
		});

		it('clears the old error when the dialog is opened again', async () => {
			vi.mocked(cyclesApi.open).mockRejectedValue(
				new ApiError(500, 'INTERNAL_ERROR', 'The server had a problem.'),
			);
			const { user } = setup('draft');
			await user.click(screen.getByRole('button', { name: 'Open cycle' }));
			await user.click(within(dialog()).getByRole('button', { name: 'Open cycle' }));
			await within(dialog()).findByRole('alert');
			await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));

			await user.click(screen.getByRole('button', { name: 'Open cycle' }));
			expect(within(dialog()).queryByRole('alert')).not.toBeInTheDocument();
		});
	});

	describe('closing and reopening', () => {
		it('closes an open cycle after confirmation', async () => {
			vi.mocked(cyclesApi.close).mockResolvedValue(makeCycle({ status: 'closed' }));
			const { user } = setup('open');
			await user.click(screen.getByRole('button', { name: 'Close cycle' }));
			await user.click(within(dialog()).getByRole('button', { name: 'Close cycle' }));

			await waitFor(() => expect(cyclesApi.close).toHaveBeenCalledWith(1));
		});

		it('reopens a closed cycle after confirmation, without typing the name', async () => {
			vi.mocked(cyclesApi.reopen).mockResolvedValue(makeCycle({ status: 'open' }));
			const { user } = setup('closed');
			await user.click(screen.getByRole('button', { name: 'Reopen cycle' }));

			expect(within(dialog()).queryByLabelText('Type the cycle name to confirm')).toBeNull();
			await user.click(within(dialog()).getByRole('button', { name: 'Reopen cycle' }));
			await waitFor(() => expect(cyclesApi.reopen).toHaveBeenCalledWith(1));
		});
	});

	describe('finalizing', () => {
		async function startFinalize(user: ReturnType<typeof userEvent.setup>) {
			await user.click(screen.getByRole('button', { name: 'Finalize cycle' }));
		}

		it('needs the cycle name typed before it can be confirmed', async () => {
			const { user } = setup('closed');
			await startFinalize(user);

			const confirm = within(dialog()).getByRole('button', { name: 'Finalize cycle' });
			expect(confirm).toBeDisabled();
			await user.type(within(dialog()).getByLabelText('Type the cycle name to confirm'), 'Annual 2026');
			expect(confirm).toBeEnabled();
			expect(cyclesApi.finalize).not.toHaveBeenCalled();
		});

		it('finalizes and shows the result with no warnings', async () => {
			vi.mocked(cyclesApi.finalize).mockResolvedValue({
				...makeCycle({ status: 'finalized' }),
				warnings: [],
			});
			const { user } = setup('closed');
			await startFinalize(user);
			await user.type(within(dialog()).getByLabelText('Type the cycle name to confirm'), 'Annual 2026');
			await user.click(within(dialog()).getByRole('button', { name: 'Finalize cycle' }));

			expect(await screen.findByRole('heading', { name: 'Cycle finalized' })).toBeInTheDocument();
			expect(screen.getByText('No warnings.')).toBeInTheDocument();
			expect(cyclesApi.finalize).toHaveBeenCalledWith(1);
		});

		it('shows the warnings the server returns', async () => {
			vi.mocked(cyclesApi.finalize).mockResolvedValue({
				...makeCycle({ status: 'finalized' }),
				warnings: [{ code: 'NO_RESULT', userId: 7, message: 'Sara has no result.' }],
			});
			const { user } = setup('closed');
			await startFinalize(user);
			await user.type(within(dialog()).getByLabelText('Type the cycle name to confirm'), 'Annual 2026');
			await user.click(within(dialog()).getByRole('button', { name: 'Finalize cycle' }));

			expect(await screen.findByText('Sara has no result.')).toBeInTheDocument();
			expect(
				screen.getByText('1 person has no result and gets no reward proposal.'),
			).toBeInTheDocument();
		});

		it('treats a missing warnings list as no warnings', async () => {
			vi.mocked(cyclesApi.finalize).mockResolvedValue(
				makeCycle({ status: 'finalized' }) as unknown as Awaited<
					ReturnType<typeof cyclesApi.finalize>
				>,
			);
			const { user } = setup('closed');
			await startFinalize(user);
			await user.type(within(dialog()).getByLabelText('Type the cycle name to confirm'), 'Annual 2026');
			await user.click(within(dialog()).getByRole('button', { name: 'Finalize cycle' }));

			expect(await screen.findByText('No warnings.')).toBeInTheDocument();
		});

		it('lists the gaps and overlaps when the reward bands are incomplete', async () => {
			vi.mocked(cyclesApi.finalize).mockRejectedValue(
				new ApiError(422, 'REWARD_BANDS_INCOMPLETE', 'Bands incomplete.', [
					{ field: 'bands', message: 'Gap between 3.0 and 3.5.' },
					{ field: 'bands', message: 'Overlap at 4.0.' },
				]),
			);
			const { user } = setup('closed');
			await startFinalize(user);
			await user.type(within(dialog()).getByLabelText('Type the cycle name to confirm'), 'Annual 2026');
			await user.click(within(dialog()).getByRole('button', { name: 'Finalize cycle' }));

			const alert = await within(dialog()).findByRole('alert');
			expect(alert).toHaveTextContent('The reward bands have gaps or overlaps.');
			expect(within(alert).getByText('Gap between 3.0 and 3.5.')).toBeInTheDocument();
			expect(within(alert).getByText('Overlap at 4.0.')).toBeInTheDocument();
			expect(screen.queryByText('Cycle finalized')).not.toBeInTheDocument();
		});
	});
});
