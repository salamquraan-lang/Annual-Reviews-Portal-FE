import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { cyclesApi } from '../api/cycles';
import { makeCycle } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import type { CycleFormMode } from './CycleFormModal';
import { CycleFormModal } from './CycleFormModal';

vi.mock('../api/cycles');

type User = ReturnType<typeof userEvent.setup>;

function setup(mode: CycleFormMode) {
	const onClose = vi.fn();
	const onSaved = vi.fn();
	renderWithProviders(<CycleFormModal mode={mode} onClose={onClose} onSaved={onSaved} />);
	return { onClose, onSaved, user: userEvent.setup() };
}

async function fillCreateForm(
	user: User,
	values: { name?: string; year?: string; start?: string; end?: string } = {},
) {
	const { name = 'Annual 2026', year = '2026', start = '2026-01-01', end = '2026-12-31' } = values;
	await user.type(screen.getByLabelText('Name'), name);
	await user.clear(screen.getByLabelText('Year'));
	await user.type(screen.getByLabelText('Year'), year);
	fireEvent.change(screen.getByLabelText('Start date'), { target: { value: start } });
	fireEvent.change(screen.getByLabelText('End date'), { target: { value: end } });
}

describe('CycleFormModal', () => {
	beforeEach(() => {
		for (const fn of Object.values(cyclesApi)) vi.mocked(fn).mockReset();
	});

	describe('create mode', () => {
		it('shows an empty form with the current year and Annual selected', () => {
			setup({ kind: 'create' });
			expect(screen.getByRole('heading', { name: 'New cycle' })).toBeInTheDocument();
			expect(screen.getByLabelText('Name')).toHaveValue('');
			expect(screen.getByLabelText('Type')).toHaveValue('annual');
			expect(screen.getByLabelText('Year')).toHaveValue(String(new Date().getFullYear()));
			expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
		});

		it('puts the focus in the Name field', () => {
			setup({ kind: 'create' });
			expect(screen.getByLabelText('Name')).toHaveFocus();
		});

		it('shows an error under every empty required field and does not call the server', async () => {
			const { user } = setup({ kind: 'create' });
			await user.clear(screen.getByLabelText('Year'));
			await user.click(screen.getByRole('button', { name: 'Create' }));

			expect(await screen.findByText('Enter a cycle name.')).toBeInTheDocument();
			expect(screen.getByText('Enter a year between 2000 and 2100.')).toBeInTheDocument();
			expect(screen.getByText('Choose a start date.')).toBeInTheDocument();
			expect(screen.getByText('Choose an end date.')).toBeInTheDocument();
			expect(cyclesApi.create).not.toHaveBeenCalled();
		});

		it('clears the error of a field when it is edited', async () => {
			const { user } = setup({ kind: 'create' });
			await user.click(screen.getByRole('button', { name: 'Create' }));
			await screen.findByText('Enter a cycle name.');

			await user.type(screen.getByLabelText('Name'), 'A');
			expect(screen.queryByText('Enter a cycle name.')).not.toBeInTheDocument();
		});

		it('creates the cycle with trimmed text and a numeric year, then closes', async () => {
			vi.mocked(cyclesApi.create).mockResolvedValue(makeCycle({ id: 9 }));
			const { onClose, onSaved, user } = setup({ kind: 'create' });
			await fillCreateForm(user, { name: '  Annual 2026  ' });
			await user.click(screen.getByRole('button', { name: 'Create' }));

			await waitFor(() =>
				expect(cyclesApi.create).toHaveBeenCalledWith({
					name: 'Annual 2026',
					type: 'annual',
					year: 2026,
					startDate: '2026-01-01',
					endDate: '2026-12-31',
				}),
			);
			await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
			expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }));
		});

		it('sends the chosen type', async () => {
			vi.mocked(cyclesApi.create).mockResolvedValue(makeCycle());
			const { user } = setup({ kind: 'create' });
			await fillCreateForm(user);
			await user.selectOptions(screen.getByLabelText('Type'), 'midyear');
			await user.click(screen.getByRole('button', { name: 'Create' }));

			await waitFor(() =>
				expect(cyclesApi.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'midyear' })),
			);
		});

		it('rejects an end date before the start date', async () => {
			const { user } = setup({ kind: 'create' });
			await fillCreateForm(user, { start: '2026-06-02', end: '2026-06-01' });
			await user.click(screen.getByRole('button', { name: 'Create' }));

			expect(
				await screen.findByText('The end date must not be before the start date.'),
			).toBeInTheDocument();
			expect(cyclesApi.create).not.toHaveBeenCalled();
		});

		it('closes from Cancel without calling the server', async () => {
			const { onClose, user } = setup({ kind: 'create' });
			await user.click(screen.getByRole('button', { name: 'Cancel' }));
			expect(onClose).toHaveBeenCalledTimes(1);
			expect(cyclesApi.create).not.toHaveBeenCalled();
		});
	});

	describe('the year check', () => {
		it('asks for confirmation when the year does not fit the dates', async () => {
			const { user } = setup({ kind: 'create' });
			await fillCreateForm(user, { year: '2022' });
			await user.click(screen.getByRole('button', { name: 'Create' }));

			expect(await screen.findByRole('heading', { name: 'Check the year' })).toBeInTheDocument();
			expect(
				screen.getByText('The dates are in 2026 but the year is 2022. Check that this is what you want.'),
			).toBeInTheDocument();
			expect(cyclesApi.create).not.toHaveBeenCalled();
		});

		it('creates the cycle after Create anyway', async () => {
			vi.mocked(cyclesApi.create).mockResolvedValue(makeCycle());
			const { onClose, user } = setup({ kind: 'create' });
			await fillCreateForm(user, { year: '2022' });
			await user.click(screen.getByRole('button', { name: 'Create' }));

			const warning = (await screen.findByRole('heading', { name: 'Check the year' })).closest(
				'dialog',
			) as HTMLElement;
			await user.click(within(warning).getByRole('button', { name: 'Create anyway' }));

			await waitFor(() =>
				expect(cyclesApi.create).toHaveBeenCalledWith(expect.objectContaining({ year: 2022 })),
			);
			await waitFor(() => expect(onClose).toHaveBeenCalled());
		});

		it('goes back to the form when the warning is cancelled', async () => {
			const { onClose, user } = setup({ kind: 'create' });
			await fillCreateForm(user, { year: '2022' });
			await user.click(screen.getByRole('button', { name: 'Create' }));

			const warning = (await screen.findByRole('heading', { name: 'Check the year' })).closest(
				'dialog',
			) as HTMLElement;
			await user.click(within(warning).getByRole('button', { name: 'Cancel' }));

			expect(screen.queryByRole('heading', { name: 'Check the year' })).not.toBeInTheDocument();
			expect(screen.getByLabelText('Year')).toHaveValue('2022');
			expect(cyclesApi.create).not.toHaveBeenCalled();
			expect(onClose).not.toHaveBeenCalled();
		});

		it('does not ask when the year is the year before the dates, like Annual 2025 run in 2026', async () => {
			vi.mocked(cyclesApi.create).mockResolvedValue(makeCycle());
			const { user } = setup({ kind: 'create' });
			await fillCreateForm(user, { year: '2025' });
			await user.click(screen.getByRole('button', { name: 'Create' }));

			await waitFor(() => expect(cyclesApi.create).toHaveBeenCalled());
			expect(screen.queryByRole('heading', { name: 'Check the year' })).not.toBeInTheDocument();
		});
	});

	describe('server errors', () => {
		async function submitWithError(error: ApiError) {
			vi.mocked(cyclesApi.create).mockRejectedValue(error);
			const result = setup({ kind: 'create' });
			await fillCreateForm(result.user);
			await result.user.click(screen.getByRole('button', { name: 'Create' }));
			return result;
		}

		it('shows a taken year and type under Year', async () => {
			const { onClose } = await submitWithError(
				new ApiError(409, 'CYCLE_YEAR_TYPE_TAKEN', 'Taken.'),
			);
			expect(await screen.findByText('Annual cycle for 2026 already exists.')).toBeInTheDocument();
			expect(onClose).not.toHaveBeenCalled();
		});

		it('shows a date range error under End date', async () => {
			await submitWithError(new ApiError(422, 'INVALID_DATE_RANGE', 'Bad range.'));
			expect(
				await screen.findByText('The start date must not be after the end date.'),
			).toBeInTheDocument();
		});

		it('places validation messages under their fields', async () => {
			await submitWithError(
				new ApiError(422, 'VALIDATION_ERROR', 'Invalid.', [
					{ field: 'name', message: 'name is too long.' },
					{ field: 'year', message: 'year is not valid.' },
				]),
			);
			expect(await screen.findByText('name is too long.')).toBeInTheDocument();
			expect(screen.getByText('year is not valid.')).toBeInTheDocument();
		});

		it('shows a validation message for an unknown field at the bottom of the form', async () => {
			await submitWithError(
				new ApiError(422, 'VALIDATION_ERROR', 'Invalid.', [
					{ field: 'other', message: 'Something else is wrong.' },
				]),
			);
			expect(await screen.findByText('Something else is wrong.')).toBeInTheDocument();
		});

		it('shows the server message for other API errors', async () => {
			await submitWithError(new ApiError(500, 'INTERNAL_ERROR', 'The server had a problem.'));
			expect(await screen.findByText('The server had a problem.')).toBeInTheDocument();
		});

		it('shows a general message when the failure is not an API error', async () => {
			vi.mocked(cyclesApi.create).mockRejectedValue(new Error('boom'));
			const { user } = setup({ kind: 'create' });
			await fillCreateForm(user);
			await user.click(screen.getByRole('button', { name: 'Create' }));

			expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
		});
	});

	describe('edit mode', () => {
		const cycle = makeCycle({ id: 4, name: 'Annual 2026' });

		it('starts with the values of the cycle', () => {
			setup({ kind: 'edit', cycle });
			expect(screen.getByRole('heading', { name: 'Edit cycle' })).toBeInTheDocument();
			expect(screen.getByLabelText('Name')).toHaveValue('Annual 2026');
			expect(screen.getByLabelText('Year')).toHaveValue('2026');
			expect(screen.getByLabelText('Start date')).toHaveValue('2026-01-01');
			expect(screen.getByLabelText('End date')).toHaveValue('2026-12-31');
			expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
		});

		it('sends only the fields that changed', async () => {
			vi.mocked(cyclesApi.update).mockResolvedValue(makeCycle({ name: 'Renamed' }));
			const { onClose, user } = setup({ kind: 'edit', cycle });
			await user.clear(screen.getByLabelText('Name'));
			await user.type(screen.getByLabelText('Name'), 'Renamed');
			await user.click(screen.getByRole('button', { name: 'Save' }));

			await waitFor(() => expect(cyclesApi.update).toHaveBeenCalledWith(4, { name: 'Renamed' }));
			await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		});

		it('closes without a request when nothing changed', async () => {
			const { onClose, onSaved, user } = setup({ kind: 'edit', cycle });
			await user.click(screen.getByRole('button', { name: 'Save' }));

			expect(onClose).toHaveBeenCalledTimes(1);
			expect(onSaved).not.toHaveBeenCalled();
			expect(cyclesApi.update).not.toHaveBeenCalled();
		});

		it('does not show the year warning when only the name changed', async () => {
			const odd = makeCycle({ id: 4, name: 'Old', year: 2022 });
			vi.mocked(cyclesApi.update).mockResolvedValue(odd);
			const { user } = setup({ kind: 'edit', cycle: odd });
			await user.type(screen.getByLabelText('Name'), ' v2');
			await user.click(screen.getByRole('button', { name: 'Save' }));

			await waitFor(() => expect(cyclesApi.update).toHaveBeenCalledWith(4, { name: 'Old v2' }));
			expect(screen.queryByRole('heading', { name: 'Check the year' })).not.toBeInTheDocument();
		});

		it('shows the year warning when the year is changed to one that does not fit', async () => {
			const { user } = setup({ kind: 'edit', cycle });
			await user.clear(screen.getByLabelText('Year'));
			await user.type(screen.getByLabelText('Year'), '2030');
			await user.click(screen.getByRole('button', { name: 'Save' }));

			expect(await screen.findByRole('button', { name: 'Save anyway' })).toBeInTheDocument();
		});

		it('explains that only a draft can be changed', async () => {
			vi.mocked(cyclesApi.update).mockRejectedValue(
				new ApiError(409, 'CYCLE_NOT_DRAFT', 'Not a draft.'),
			);
			const { user } = setup({ kind: 'edit', cycle });
			await user.type(screen.getByLabelText('Name'), '!');
			await user.click(screen.getByRole('button', { name: 'Save' }));

			expect(
				await screen.findByText(
					'Only a draft can be changed, and this cycle is no longer a draft. Close this form to see its current state.',
				),
			).toBeInTheDocument();
		});
	});

	describe('copy mode', () => {
		const source = makeCycle({ id: 2, name: 'Annual 2026', status: 'finalized' });

		it('suggests the next year and says a new draft is created', () => {
			setup({ kind: 'copy', source });
			expect(screen.getByRole('heading', { name: 'Copy cycle' })).toBeInTheDocument();
			expect(screen.getByText('This creates a new draft based on Annual 2026.')).toBeInTheDocument();
			expect(screen.getByLabelText('Name')).toHaveValue('Annual 2027');
			expect(screen.getByLabelText('Year')).toHaveValue('2027');
			expect(screen.getByLabelText('Start date')).toHaveValue('2027-01-01');
			expect(screen.getByLabelText('End date')).toHaveValue('2027-12-31');
			expect(screen.getByRole('button', { name: 'Create copy' })).toBeInTheDocument();
		});

		it('copies from the source cycle and reports the new cycle', async () => {
			vi.mocked(cyclesApi.copy).mockResolvedValue(makeCycle({ id: 10, name: 'Annual 2027' }));
			const { onClose, onSaved, user } = setup({ kind: 'copy', source });
			await user.click(screen.getByRole('button', { name: 'Create copy' }));

			await waitFor(() =>
				expect(cyclesApi.copy).toHaveBeenCalledWith(2, {
					name: 'Annual 2027',
					type: 'annual',
					year: 2027,
					startDate: '2027-01-01',
					endDate: '2027-12-31',
				}),
			);
			await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
			expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }));
			expect(cyclesApi.create).not.toHaveBeenCalled();
		});

		it('shows an error under Year when the copy already exists', async () => {
			vi.mocked(cyclesApi.copy).mockRejectedValue(
				new ApiError(409, 'CYCLE_YEAR_TYPE_TAKEN', 'Taken.'),
			);
			const { onSaved, user } = setup({ kind: 'copy', source });
			await user.click(screen.getByRole('button', { name: 'Create copy' }));

			expect(await screen.findByText('Annual cycle for 2027 already exists.')).toBeInTheDocument();
			expect(onSaved).not.toHaveBeenCalled();
		});
	});
});
