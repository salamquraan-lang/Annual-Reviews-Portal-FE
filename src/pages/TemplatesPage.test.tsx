import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { cyclesApi } from '../api/cycles';
import { templatesApi } from '../api/templates';
import { makeCycle } from '../test/fixtures';
import { makeTemplate, makeTemplateSummary } from '../test/questionBankFixtures';
import { renderWithProviders } from '../test/render';
import { TemplatesPage } from './TemplatesPage';

vi.mock('../api/cycles');
vi.mock('../api/templates');
vi.mock('../api/questionBank');

function setup(route = '/cycles/1/templates') {
	renderWithProviders(
		<Routes>
			<Route path="/cycles/:id/templates" element={<TemplatesPage />} />
		</Routes>,
		route,
	);
	return userEvent.setup();
}

const SUMMARIES = [
	makeTemplateSummary({ id: 11, reviewType: 'self', name: 'Self review', questionCount: 2 }),
	makeTemplateSummary({ id: 12, reviewType: 'manager', name: 'Manager review', questionCount: 4 }),
	makeTemplateSummary({ id: 13, reviewType: 'peer', name: 'Peer review', questionCount: 0 }),
	makeTemplateSummary({ id: 14, reviewType: 'upward', name: 'Upward review', questionCount: 0 }),
];

describe('TemplatesPage', () => {
	beforeEach(() => {
		for (const fn of Object.values(cyclesApi)) vi.mocked(fn).mockReset();
		for (const fn of Object.values(templatesApi)) vi.mocked(fn).mockReset();
		vi.mocked(cyclesApi.get).mockResolvedValue(makeCycle());
		vi.mocked(templatesApi.listForCycle).mockResolvedValue(SUMMARIES);
		vi.mocked(templatesApi.get).mockImplementation(async (id) => {
			const summary = SUMMARIES.find((item) => item.id === id) ?? SUMMARIES[0];
			return makeTemplate({ ...summary, sections: [] });
		});
	});

	it('shows one tab per review type with its question count, and opens the self form first', async () => {
		setup();
		expect(await screen.findByRole('tab', { name: /Self review\s*2/ })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tab', { name: /Manager review\s*4/ })).toBeInTheDocument();
		await waitFor(() => expect(templatesApi.get).toHaveBeenCalledWith(11));
	});

	it('opens the form named in the address, and keeps the tab in the address', async () => {
		const user = setup('/cycles/1/templates?type=manager');
		await waitFor(() => expect(templatesApi.get).toHaveBeenCalledWith(12));

		await user.click(await screen.findByRole('tab', { name: /Peer review/ }));
		await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/cycles/1/templates?type=peer'));
		await waitFor(() => expect(templatesApi.get).toHaveBeenCalledWith(13));
	});

	it('explains a cycle that has no forms', async () => {
		vi.mocked(templatesApi.listForCycle).mockResolvedValue([]);
		setup();
		expect(await screen.findByText(/This cycle has no forms yet/)).toBeInTheDocument();
	});

	it('shows "not found" for a missing cycle or a bad id', async () => {
		vi.mocked(cyclesApi.get).mockRejectedValue(new ApiError(404, 'CYCLE_NOT_FOUND', 'Cycle not found.'));
		setup();
		expect(await screen.findByRole('heading', { name: 'Cycle not found' })).toBeInTheDocument();
	});

	it('does not call the server for an id that is not a number', () => {
		setup('/cycles/abc/templates');
		expect(screen.getByRole('heading', { name: 'Cycle not found' })).toBeInTheDocument();
		expect(cyclesApi.get).not.toHaveBeenCalled();
	});
});
