import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { criteriaApi, questionsApi } from '../api/questionBank';
import { makeCriterion, makeQuestionItem } from '../test/questionBankFixtures';
import { renderWithProviders } from '../test/render';
import { CriteriaPanel } from './CriteriaPanel';
import { CriterionFormModal } from './CriterionFormModal';
import { QuestionsPanel } from './QuestionsPanel';

vi.mock('../api/questionBank');

function page(items = [makeQuestionItem()]) {
	return { items, page: 1, pageSize: 20, total: items.length };
}

beforeEach(() => {
	for (const fn of [...Object.values(criteriaApi), ...Object.values(questionsApi)]) vi.mocked(fn).mockReset();
	vi.mocked(criteriaApi.list).mockResolvedValue({ items: [makeCriterion()] });
	vi.mocked(questionsApi.list).mockResolvedValue(page());
});

describe('CriterionFormModal', () => {
	it('creates a criterion with the trimmed name and no empty description', async () => {
		vi.mocked(criteriaApi.create).mockResolvedValue(makeCriterion());
		const onClose = vi.fn();
		renderWithProviders(<CriterionFormModal onClose={onClose} />);
		const user = userEvent.setup();
		await user.type(screen.getByLabelText('Name'), '  Teamwork  ');
		await user.click(screen.getByRole('button', { name: 'Create' }));
		await waitFor(() => expect(criteriaApi.create).toHaveBeenCalledWith({ name: 'Teamwork', description: null }));
		expect(onClose).toHaveBeenCalled();
	});

	it('asks for a name before calling the server', async () => {
		renderWithProviders(<CriterionFormModal onClose={vi.fn()} />);
		await userEvent.setup().click(screen.getByRole('button', { name: 'Create' }));
		expect(screen.getByText('Enter a name.')).toBeInTheDocument();
		expect(criteriaApi.create).not.toHaveBeenCalled();
	});

	it('shows a taken name under the name field', async () => {
		vi.mocked(criteriaApi.create).mockRejectedValue(
			new ApiError(409, 'CRITERION_NAME_TAKEN', 'A criterion with this name already exists.'),
		);
		renderWithProviders(<CriterionFormModal onClose={vi.fn()} />);
		const user = userEvent.setup();
		await user.type(screen.getByLabelText('Name'), 'teamwork');
		await user.click(screen.getByRole('button', { name: 'Create' }));
		expect(await screen.findByText('A criterion with this name already exists.')).toBeInTheDocument();
	});

	it('sends only the fields that changed', async () => {
		vi.mocked(criteriaApi.update).mockResolvedValue({ ...makeCriterion(), questions: [] });
		renderWithProviders(
			<CriterionFormModal criterion={makeCriterion({ description: 'Old text' })} onClose={vi.fn()} />,
		);
		const user = userEvent.setup();
		await user.clear(screen.getByLabelText('Description (optional)'));
		await user.click(screen.getByRole('button', { name: 'Save' }));
		await waitFor(() => expect(criteriaApi.update).toHaveBeenCalledWith(1, { description: null }));
	});
});

describe('QuestionsPanel', () => {
	function setup() {
		renderWithProviders(
			<QuestionsPanel criterionId="" onCriterionChange={vi.fn()} creating={false} onCloseCreate={vi.fn()} />,
		);
		return userEvent.setup();
	}

	it('does not offer Delete for a question a template uses', async () => {
		vi.mocked(questionsApi.list).mockResolvedValue(
			page([makeQuestionItem({ id: 1, text: 'Used one.', used: true }), makeQuestionItem({ id: 2, text: 'Free one.' })]),
		);
		setup();
		const used = (await screen.findByText('Used one.')).closest('tr') as HTMLElement;
		const free = screen.getByText('Free one.').closest('tr') as HTMLElement;
		expect(within(used).getByRole('button', { name: 'Delete' })).toBeDisabled();
		expect(within(free).getByRole('button', { name: 'Delete' })).toBeEnabled();
	});

	it('archives and unarchives', async () => {
		vi.mocked(questionsApi.list).mockResolvedValue(
			page([makeQuestionItem({ id: 1, text: 'Active.' }), makeQuestionItem({ id: 2, text: 'Old.', archived: true })]),
		);
		vi.mocked(questionsApi.archive).mockResolvedValue({ ...makeQuestionItem(), locked: false, usage: [] });
		vi.mocked(questionsApi.unarchive).mockResolvedValue({ ...makeQuestionItem(), locked: false, usage: [] });
		const user = setup();
		await user.click(within((await screen.findByText('Active.')).closest('tr') as HTMLElement).getByRole('button', { name: 'Archive' }));
		await user.click(within(screen.getByText('Old.').closest('tr') as HTMLElement).getByRole('button', { name: 'Unarchive' }));
		await waitFor(() => expect(questionsApi.archive).toHaveBeenCalledWith(1));
		await waitFor(() => expect(questionsApi.unarchive).toHaveBeenCalledWith(2));
	});

	it('sends the filters to the server and starts again from page 1', async () => {
		const user = setup();
		await screen.findByText('Explains ideas clearly.');
		await user.selectOptions(screen.getByLabelText('Type'), 'text');
		await user.click(screen.getByLabelText('Show archived'));
		await waitFor(() =>
			expect(questionsApi.list).toHaveBeenLastCalledWith(
				expect.objectContaining({ kind: 'text', showArchived: true, page: 1 }),
			),
		);
	});
});

describe('CriteriaPanel', () => {
	it('only lets a criterion without questions be deleted', async () => {
		vi.mocked(criteriaApi.list).mockResolvedValue({
			items: [makeCriterion({ id: 1, name: 'Full', questionCount: 2 }), makeCriterion({ id: 2, name: 'Empty' })],
		});
		vi.mocked(criteriaApi.remove).mockResolvedValue(undefined);
		renderWithProviders(<CriteriaPanel creating={false} onCloseCreate={vi.fn()} onShowQuestions={vi.fn()} />);
		const user = userEvent.setup();

		const full = (await screen.findByText('Full')).closest('tr') as HTMLElement;
		expect(within(full).getByRole('button', { name: 'Delete' })).toBeDisabled();

		await user.click(within(screen.getByText('Empty').closest('tr') as HTMLElement).getByRole('button', { name: 'Delete' }));
		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
		await waitFor(() => expect(criteriaApi.remove).toHaveBeenCalledWith(2));
	});
});
