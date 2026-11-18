import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { cyclesApi } from '../api/cycles';
import { makeCycle } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { ChangeEndDateModal } from './ChangeEndDateModal';

vi.mock('../api/cycles');

function setup() {
	const onClose = vi.fn();
	const cycle = makeCycle({ status: 'open' });
	renderWithProviders(<ChangeEndDateModal cycle={cycle} onClose={onClose} />);
	return { onClose, user: userEvent.setup() };
}

function setEndDate(value: string) {
	fireEvent.change(screen.getByLabelText('End date'), { target: { value } });
}

describe('ChangeEndDateModal', () => {
	beforeEach(() => {
		for (const fn of Object.values(cyclesApi)) vi.mocked(fn).mockReset();
	});

	it('starts with the current end date and shows the start date as a hint', () => {
		setup();
		expect(screen.getByLabelText('End date')).toHaveValue('2026-12-31');
		expect(screen.getByText('The cycle starts on 1 Jan 2026.')).toBeInTheDocument();
	});

	it('closes without a request when the date did not change', async () => {
		const { onClose, user } = setup();
		await user.click(screen.getByRole('button', { name: 'Save' }));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(cyclesApi.changeEndDate).not.toHaveBeenCalled();
	});

	it('asks for a date when the field is empty', async () => {
		const { user } = setup();
		setEndDate('');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		expect(await screen.findByText('Choose an end date.')).toBeInTheDocument();
		expect(cyclesApi.changeEndDate).not.toHaveBeenCalled();
	});

	it('rejects a date before the start date without calling the server', async () => {
		const { user } = setup();
		setEndDate('2025-12-31');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		expect(
			await screen.findByText('The end date must not be before the start date.'),
		).toBeInTheDocument();
		expect(cyclesApi.changeEndDate).not.toHaveBeenCalled();
	});

	it('sends the new date and closes', async () => {
		vi.mocked(cyclesApi.changeEndDate).mockResolvedValue(makeCycle({ endDate: '2027-01-31' }));
		const { onClose, user } = setup();
		setEndDate('2027-01-31');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() => expect(cyclesApi.changeEndDate).toHaveBeenCalledWith(1, '2027-01-31'));
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
	});

	it('shows the past date error under the field', async () => {
		vi.mocked(cyclesApi.changeEndDate).mockRejectedValue(
			new ApiError(422, 'END_DATE_IN_PAST', 'In the past.'),
		);
		const { onClose, user } = setup();
		setEndDate('2026-06-01');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		expect(await screen.findByText('The end date cannot be in the past.')).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
	});

	it('says the cycle is no longer open when the status changed', async () => {
		vi.mocked(cyclesApi.changeEndDate).mockRejectedValue(
			new ApiError(409, 'CYCLE_INVALID_STATUS', 'Wrong status.'),
		);
		const { user } = setup();
		setEndDate('2027-01-31');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		expect(
			await screen.findByText(
				'This cycle is no longer open, so its end date cannot be changed. The page was refreshed.',
			),
		).toBeInTheDocument();
	});

	it('puts a server validation message under the field', async () => {
		vi.mocked(cyclesApi.changeEndDate).mockRejectedValue(
			new ApiError(422, 'VALIDATION_ERROR', 'Invalid.', [
				{ field: 'endDate', message: 'endDate must be a date.' },
			]),
		);
		const { user } = setup();
		setEndDate('2027-01-31');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		expect(await screen.findByText('endDate must be a date.')).toBeInTheDocument();
	});

	it('shows the server message for other errors', async () => {
		vi.mocked(cyclesApi.changeEndDate).mockRejectedValue(
			new ApiError(500, 'INTERNAL_ERROR', 'The server had a problem.'),
		);
		const { user } = setup();
		setEndDate('2027-01-31');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		expect(await screen.findByText('The server had a problem.')).toBeInTheDocument();
	});

	it('closes from Cancel', async () => {
		const { onClose, user } = setup();
		await user.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
