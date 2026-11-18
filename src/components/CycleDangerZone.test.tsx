import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { cyclesApi } from '../api/cycles';
import { makeCycle } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { CycleDangerZone } from './CycleDangerZone';

vi.mock('../api/cycles');

function setup() {
	renderWithProviders(<CycleDangerZone cycle={makeCycle()} />, '/cycles/1');
	return userEvent.setup();
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole('button', { name: 'Delete cycle' }));
	return screen.getByRole('dialog');
}

describe('CycleDangerZone', () => {
	beforeEach(() => {
		for (const fn of Object.values(cyclesApi)) vi.mocked(fn).mockReset();
	});

	it('shows the danger zone with a Delete button', () => {
		setup();
		expect(screen.getByRole('heading', { name: 'Danger zone' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Delete cycle' })).toBeInTheDocument();
	});

	it('does not call the server until the name is typed and confirmed', async () => {
		const user = setup();
		const dialog = await openDialog(user);

		const confirm = within(dialog).getByRole('button', { name: 'Delete cycle' });
		expect(confirm).toBeDisabled();
		await user.type(within(dialog).getByLabelText('Type the cycle name to confirm'), 'Annual');
		expect(confirm).toBeDisabled();
		expect(cyclesApi.remove).not.toHaveBeenCalled();
	});

	it('deletes the cycle and goes back to the list', async () => {
		vi.mocked(cyclesApi.remove).mockResolvedValue(undefined);
		const user = setup();
		const dialog = await openDialog(user);

		await user.type(within(dialog).getByLabelText('Type the cycle name to confirm'), 'Annual 2026');
		await user.click(within(dialog).getByRole('button', { name: 'Delete cycle' }));

		await waitFor(() => expect(cyclesApi.remove).toHaveBeenCalledWith(1));
		await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/cycles'));
		expect(screen.getByTestId('location')).not.toHaveTextContent('/cycles/1');
	});

	it('explains when the cycle is no longer a draft', async () => {
		vi.mocked(cyclesApi.remove).mockRejectedValue(
			new ApiError(409, 'CYCLE_NOT_DRAFT', 'Not a draft.'),
		);
		const user = setup();
		const dialog = await openDialog(user);
		await user.type(within(dialog).getByLabelText('Type the cycle name to confirm'), 'Annual 2026');
		await user.click(within(dialog).getByRole('button', { name: 'Delete cycle' }));

		expect(await within(dialog).findByRole('alert')).toHaveTextContent(
			'Only a draft can be deleted, and this cycle is no longer a draft. The page was refreshed.',
		);
		expect(screen.getByTestId('location')).toHaveTextContent('/cycles/1');
	});

	it('links back to the list when the cycle is already gone', async () => {
		vi.mocked(cyclesApi.remove).mockRejectedValue(
			new ApiError(404, 'CYCLE_NOT_FOUND', 'Not found.'),
		);
		const user = setup();
		const dialog = await openDialog(user);
		await user.type(within(dialog).getByLabelText('Type the cycle name to confirm'), 'Annual 2026');
		await user.click(within(dialog).getByRole('button', { name: 'Delete cycle' }));

		const alert = await within(dialog).findByRole('alert');
		expect(within(alert).getByRole('link', { name: 'Back to cycles' })).toBeInTheDocument();
	});

	it('closes the dialog from Cancel', async () => {
		const user = setup();
		const dialog = await openDialog(user);
		await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(cyclesApi.remove).not.toHaveBeenCalled();
	});
});
