import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { questionsApi } from '../api/questionBank';
import { templatesApi } from '../api/templates';
import { makeQuestionItem, makeTemplate } from '../test/questionBankFixtures';
import { renderWithProviders } from '../test/render';
import type { Template } from '../types/templates';
import { TemplateEditor } from './TemplateEditor';

vi.mock('../api/templates');
vi.mock('../api/questionBank');
vi.mock('../api/cycles');

function setup(template: Template = makeTemplate()) {
	renderWithProviders(<TemplateEditor template={template} />, '/cycles/1/templates');
	return userEvent.setup();
}

describe('TemplateEditor', () => {
	beforeEach(() => {
		for (const fn of Object.values(templatesApi)) vi.mocked(fn).mockReset();
		for (const fn of Object.values(questionsApi)) vi.mocked(fn).mockReset();
		vi.mocked(templatesApi.get).mockResolvedValue(makeTemplate());
	});

	it('shows each criterion as a section, with weights and their share', () => {
		setup();
		const communication = screen.getByRole('region', { name: 'Communication' });
		expect(within(communication).getByText('Explains ideas clearly.')).toBeInTheDocument();
		expect(within(communication).getByText('75%')).toBeInTheDocument();
		expect(within(communication).getByText('25%')).toBeInTheDocument();
		expect(within(communication).getByText('Not scored')).toBeInTheDocument();
		expect(within(screen.getByRole('region', { name: 'Delivery' })).getByText('100%')).toBeInTheDocument();
	});

	it('is read-only once the cycle is no longer a draft', () => {
		setup(makeTemplate({ editable: false, cycleStatus: 'open' }));
		expect(screen.getByText(/This cycle is open/)).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Add questions' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
		expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
	});

	it('explains an empty form', () => {
		setup(makeTemplate({ sections: [], questionCount: 0 }));
		expect(screen.getByText('The manager review form has no questions yet.')).toBeInTheDocument();
	});

	it('sends the whole new order of a section when a question moves down', async () => {
		vi.mocked(templatesApi.reorderQuestions).mockResolvedValue(makeTemplate());
		const user = setup();
		await user.click(screen.getByRole('button', { name: 'Move “Explains ideas clearly.” down' }));
		await waitFor(() => expect(templatesApi.reorderQuestions).toHaveBeenCalledWith(10, 1, [2, 1, 3]));
	});

	it('sends the new order of the criteria when a section moves up', async () => {
		vi.mocked(templatesApi.reorderCriteria).mockResolvedValue(makeTemplate());
		const user = setup();
		await user.click(screen.getByRole('button', { name: 'Move Delivery up' }));
		await waitFor(() => expect(templatesApi.reorderCriteria).toHaveBeenCalledWith(10, [2, 1]));
	});

	it('does not offer moves past either end', () => {
		setup();
		expect(screen.getByRole('button', { name: 'Move Communication up' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Move “Meets deadlines.” down' })).toBeDisabled();
	});

	it('saves a new weight when Enter is pressed', async () => {
		vi.mocked(templatesApi.changeWeight).mockResolvedValue(makeTemplate());
		const user = setup();
		const input = screen.getByLabelText('Weight of “Listens to others.”');
		await user.clear(input);
		await user.type(input, '4{Enter}');
		await waitFor(() => expect(templatesApi.changeWeight).toHaveBeenCalledWith(10, 2, 4));
	});

	it('refuses a weight that is not a whole number from 1 to 1000', async () => {
		const user = setup();
		const input = screen.getByLabelText('Weight of “Listens to others.”');
		await user.clear(input);
		await user.type(input, '0{Enter}');
		expect(await screen.findByText('A whole number from 1 to 1000.')).toBeInTheDocument();
		expect(templatesApi.changeWeight).not.toHaveBeenCalled();
	});

	it('removes a question only after it is confirmed', async () => {
		vi.mocked(templatesApi.removeQuestion).mockResolvedValue(makeTemplate());
		const user = setup();
		const row = screen.getByText('Meets deadlines.').closest('li') as HTMLElement;
		await user.click(within(row).getByRole('button', { name: 'Remove' }));
		const dialog = screen.getByRole('dialog');
		expect(templatesApi.removeQuestion).not.toHaveBeenCalled();
		await user.click(within(dialog).getByRole('button', { name: 'Remove' }));
		await waitFor(() => expect(templatesApi.removeQuestion).toHaveBeenCalledWith(10, 4));
	});

	it('shows why a change was refused', async () => {
		vi.mocked(templatesApi.reorderCriteria).mockRejectedValue(
			new ApiError(409, 'TEMPLATE_LOCKED', 'A template can be changed only while its cycle is a draft. This cycle is open.'),
		);
		const user = setup();
		await user.click(screen.getByRole('button', { name: 'Move Delivery up' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('This cycle is open.');
	});

	it('adds a question picked from the bank, and marks the ones already in the form', async () => {
		vi.mocked(questionsApi.list).mockResolvedValue({
			items: [
				makeQuestionItem({ id: 1, text: 'Explains ideas clearly.' }),
				makeQuestionItem({ id: 9, text: 'Gives useful feedback.' }),
			],
			page: 1,
			pageSize: 10,
			total: 2,
		});
		vi.mocked(templatesApi.addQuestion).mockResolvedValue(makeTemplate());
		const user = setup();
		await user.click(screen.getByRole('button', { name: 'Add questions' }));
		const dialog = screen.getByRole('dialog');
		const list = await within(dialog).findByRole('list', { name: 'Questions' });

		const taken = within(list).getByText('Explains ideas clearly.').closest('li') as HTMLElement;
		expect(within(taken).getByText('Already in this form')).toBeInTheDocument();

		const free = within(list).getByText('Gives useful feedback.').closest('li') as HTMLElement;
		await user.click(within(free).getByRole('button', { name: 'Add' }));
		await waitFor(() => expect(templatesApi.addQuestion).toHaveBeenCalledWith(10, 9));
	});

	it('only offers questions of the same kind as a replacement', async () => {
		vi.mocked(questionsApi.list).mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0 });
		const user = setup();
		const row = screen.getByText('What should they keep doing?').closest('li') as HTMLElement;
		await user.click(within(row).getByRole('button', { name: 'Replace' }));
		await waitFor(() => expect(questionsApi.list).toHaveBeenCalledWith(expect.objectContaining({ kind: 'text' })));
	});
});
