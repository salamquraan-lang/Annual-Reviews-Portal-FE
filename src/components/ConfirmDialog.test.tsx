import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

function setup(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
	const onConfirm = vi.fn();
	const onClose = vi.fn();
	render(
		<ConfirmDialog
			title="Close this cycle?"
			confirmLabel="Close cycle"
			busyLabel="Closing…"
			isPending={false}
			onConfirm={onConfirm}
			onClose={onClose}
			{...props}
		>
			Scores are calculated.
		</ConfirmDialog>,
	);
	return { onConfirm, onClose, user: userEvent.setup() };
}

describe('ConfirmDialog', () => {
	it('shows the title, the text and both buttons', () => {
		setup();
		expect(screen.getByRole('heading', { name: 'Close this cycle?' })).toBeInTheDocument();
		expect(screen.getByText('Scores are calculated.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Close cycle' })).toBeEnabled();
	});

	it('calls onConfirm when the confirm button is pressed', async () => {
		const { onConfirm, user } = setup();
		await user.click(screen.getByRole('button', { name: 'Close cycle' }));
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it('calls onClose when Cancel is pressed', async () => {
		const { onClose, onConfirm, user } = setup();
		await user.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('shows the busy label and blocks the button while pending', () => {
		setup({ isPending: true });
		expect(screen.getByRole('button', { name: 'Closing…' })).toBeDisabled();
	});

	it('shows an error message', () => {
		setup({ error: 'Something failed.' });
		expect(screen.getByRole('alert')).toHaveTextContent('Something failed.');
	});

	describe('with a typed confirmation', () => {
		it('disables the confirm button until the exact name is typed', async () => {
			const { onConfirm, user } = setup({ confirmText: 'Annual 2026', danger: true });
			const confirm = screen.getByRole('button', { name: 'Close cycle' });
			const input = screen.getByLabelText('Type the cycle name to confirm');

			expect(confirm).toBeDisabled();
			await user.type(input, 'Annual 202');
			expect(confirm).toBeDisabled();
			await user.type(input, '6');
			expect(confirm).toBeEnabled();

			await user.click(confirm);
			expect(onConfirm).toHaveBeenCalledTimes(1);
		});

		it('ignores spaces around the typed name', async () => {
			const { user } = setup({ confirmText: 'Annual 2026' });
			await user.type(screen.getByLabelText('Type the cycle name to confirm'), '  Annual 2026 ');
			expect(screen.getByRole('button', { name: 'Close cycle' })).toBeEnabled();
		});

		it('is case sensitive', async () => {
			const { user } = setup({ confirmText: 'Annual 2026' });
			await user.type(screen.getByLabelText('Type the cycle name to confirm'), 'annual 2026');
			expect(screen.getByRole('button', { name: 'Close cycle' })).toBeDisabled();
		});

		it('does not confirm when Enter is pressed before the name matches', async () => {
			const { onConfirm, user } = setup({ confirmText: 'Annual 2026' });
			await user.type(screen.getByLabelText('Type the cycle name to confirm'), 'wrong{Enter}');
			expect(onConfirm).not.toHaveBeenCalled();
		});

		it('confirms with Enter once the name matches', async () => {
			const { onConfirm, user } = setup({ confirmText: 'Annual 2026' });
			await user.type(screen.getByLabelText('Type the cycle name to confirm'), 'Annual 2026{Enter}');
			expect(onConfirm).toHaveBeenCalledTimes(1);
		});

		it('puts the focus in the name field', () => {
			setup({ confirmText: 'Annual 2026' });
			expect(screen.getByLabelText('Type the cycle name to confirm')).toHaveFocus();
		});
	});

	it('puts the focus on Cancel when there is no typed confirmation', () => {
		setup();
		expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
	});
});
