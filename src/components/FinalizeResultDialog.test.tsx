import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FinalizeResultDialog } from './FinalizeResultDialog';

describe('FinalizeResultDialog', () => {
	it('says there are no warnings when the list is empty', () => {
		render(<FinalizeResultDialog warnings={[]} onClose={vi.fn()} />);
		expect(screen.getByRole('heading', { name: 'Cycle finalized' })).toBeInTheDocument();
		expect(screen.getByText('No warnings.')).toBeInTheDocument();
	});

	it('uses the singular for one warning', () => {
		render(
			<FinalizeResultDialog
				warnings={[{ code: 'NO_RESULT', userId: 7, message: 'Sara has no result.' }]}
				onClose={vi.fn()}
			/>,
		);
		expect(
			screen.getByText('1 person has no result and gets no reward proposal.'),
		).toBeInTheDocument();
		expect(screen.getByText('Sara has no result.')).toBeInTheDocument();
	});

	it('uses the plural and lists every warning', () => {
		render(
			<FinalizeResultDialog
				warnings={[
					{ code: 'NO_RESULT', userId: 7, message: 'Sara has no result.' },
					{ code: 'NO_RESULT', userId: 8, message: 'Omar has no result.' },
				]}
				onClose={vi.fn()}
			/>,
		);
		expect(
			screen.getByText('2 people have no result and get no reward proposal.'),
		).toBeInTheDocument();
		expect(screen.getAllByRole('listitem')).toHaveLength(2);
	});

	it('calls onClose from the Close button', async () => {
		const onClose = vi.fn();
		render(<FinalizeResultDialog warnings={[]} onClose={onClose} />);
		await userEvent.setup().click(screen.getByText('Close', { selector: 'button' }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
