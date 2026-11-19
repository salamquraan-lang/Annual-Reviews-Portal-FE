import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { cyclesApi } from '../api/cycles';
import { renderWithProviders } from '../test/render';
import { ReadinessPanel } from './ReadinessPanel';

vi.mock('../api/cycles');

describe('ReadinessPanel', () => {
	beforeEach(() => {
		vi.mocked(cyclesApi.readiness).mockReset();
	});

	it('shows a loading message first', () => {
		vi.mocked(cyclesApi.readiness).mockReturnValue(new Promise(() => {}));
		renderWithProviders(<ReadinessPanel cycleId={1} />);
		expect(screen.getByText('Checking readiness…')).toBeInTheDocument();
	});

	it('shows success when the cycle is ready', async () => {
		vi.mocked(cyclesApi.readiness).mockResolvedValue({ ready: true, problems: [] });
		renderWithProviders(<ReadinessPanel cycleId={1} />);
		expect(
			await screen.findByText('No problems found. This cycle can be opened.'),
		).toBeInTheDocument();
	});

	it('lists every problem when the cycle is not ready', async () => {
		vi.mocked(cyclesApi.readiness).mockResolvedValue({
			ready: false,
			problems: [
				{ code: 'ANOTHER_CYCLE_OPEN', message: 'Another cycle is already open.' },
				{ code: 'NO_TEMPLATE', message: 'The manager template is missing.' },
			],
		});
		renderWithProviders(<ReadinessPanel cycleId={1} />);

		expect(await screen.findByText(/This cycle is not ready to open/)).toBeInTheDocument();
		expect(screen.getByText('Another cycle is already open.')).toBeInTheDocument();
		expect(screen.getByText('The manager template is missing.')).toBeInTheDocument();
	});

	it('shows the server message when the check fails', async () => {
		vi.mocked(cyclesApi.readiness).mockRejectedValue(
			new ApiError(500, 'INTERNAL_ERROR', 'The server had a problem.'),
		);
		renderWithProviders(<ReadinessPanel cycleId={1} />);
		expect(await screen.findByText('The server had a problem.')).toBeInTheDocument();
	});

	it('shows nothing after the cycle stops being a draft', async () => {
		vi.mocked(cyclesApi.readiness).mockRejectedValue(
			new ApiError(409, 'CYCLE_INVALID_STATUS', 'Cycle is not a draft.'),
		);
		renderWithProviders(<ReadinessPanel cycleId={1} />);
		await waitFor(() => expect(cyclesApi.readiness).toHaveBeenCalled());
		await waitFor(() => expect(screen.queryByText('Readiness')).not.toBeInTheDocument());
	});

	it('checks again when Check again is pressed', async () => {
		vi.mocked(cyclesApi.readiness)
			.mockResolvedValueOnce({
				ready: false,
				problems: [{ code: 'X', message: 'A problem.' }],
			})
			.mockResolvedValueOnce({ ready: true, problems: [] });
		renderWithProviders(<ReadinessPanel cycleId={1} />);

		await screen.findByText('A problem.');
		await userEvent.setup().click(screen.getByRole('button', { name: 'Check again' }));

		expect(
			await screen.findByText('No problems found. This cycle can be opened.'),
		).toBeInTheDocument();
		expect(cyclesApi.readiness).toHaveBeenCalledTimes(2);
	});
});
