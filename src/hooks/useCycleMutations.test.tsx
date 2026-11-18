import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { cyclesApi } from '../api/cycles';
import { makeCycle } from '../test/fixtures';
import { useCreateCycle, useDeleteCycle, useUpdateCycle } from './useCycleMutations';
import { useCurrentCycle, useCycle, useCycles } from './useCycles';

vi.mock('../api/cycles');

function wrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('cycle hooks', () => {
	beforeEach(() => {
		for (const fn of Object.values(cyclesApi)) vi.mocked(fn).mockReset();
		vi.mocked(cyclesApi.list).mockResolvedValue({ items: [makeCycle()], page: 1, pageSize: 20, total: 1 });
		vi.mocked(cyclesApi.get).mockResolvedValue(makeCycle());
	});

	describe('useCurrentCycle', () => {
		it('returns the open cycle', async () => {
			vi.mocked(cyclesApi.current).mockResolvedValue(makeCycle({ status: 'open' }));
			const { result } = renderHook(() => useCurrentCycle(), { wrapper: wrapper() });
			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data?.status).toBe('open');
		});

		it('returns null, not an error, when no cycle is open', async () => {
			vi.mocked(cyclesApi.current).mockRejectedValue(
				new ApiError(404, 'NO_OPEN_CYCLE', 'No open cycle.'),
			);
			const { result } = renderHook(() => useCurrentCycle(), { wrapper: wrapper() });
			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toBeNull();
		});

		it('still reports other errors', async () => {
			vi.mocked(cyclesApi.current).mockRejectedValue(
				new ApiError(500, 'INTERNAL_ERROR', 'The server had a problem.'),
			);
			const { result } = renderHook(() => useCurrentCycle(), { wrapper: wrapper() });
			await waitFor(() => expect(result.current.isError).toBe(true));
		});
	});

	describe('useCycle', () => {
		it('does not ask the server for an id that is not a whole number', () => {
			renderHook(() => useCycle(Number.NaN), { wrapper: wrapper() });
			expect(cyclesApi.get).not.toHaveBeenCalled();
		});
	});

	describe('refreshing after a write', () => {
		it('reloads the list after a cycle is created', async () => {
			vi.mocked(cyclesApi.create).mockResolvedValue(makeCycle({ id: 2 }));
			const { result } = renderHook(() => ({ list: useCycles({}), create: useCreateCycle() }), {
				wrapper: wrapper(),
			});
			await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

			await act(async () => {
				await result.current.create.mutateAsync({
					name: 'Annual 2027',
					type: 'annual',
					year: 2027,
					startDate: '2027-01-01',
					endDate: '2027-12-31',
				});
			});

			await waitFor(() => expect(cyclesApi.list).toHaveBeenCalledTimes(2));
		});

		it('reloads even when an update fails, so a conflict shows the current state', async () => {
			vi.mocked(cyclesApi.update).mockRejectedValue(
				new ApiError(409, 'CYCLE_NOT_DRAFT', 'Not a draft.'),
			);
			const { result } = renderHook(() => ({ detail: useCycle(1), update: useUpdateCycle() }), {
				wrapper: wrapper(),
			});
			await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

			await act(async () => {
				await result.current.update.mutateAsync({ id: 1, data: { name: 'X' } }).catch(() => {});
			});

			await waitFor(() => expect(cyclesApi.get).toHaveBeenCalledTimes(2));
		});

		it('reloads the list after a delete, but not the deleted cycle', async () => {
			vi.mocked(cyclesApi.remove).mockResolvedValue(undefined);
			const { result } = renderHook(
				() => ({ list: useCycles({}), detail: useCycle(1), remove: useDeleteCycle() }),
				{ wrapper: wrapper() },
			);
			await waitFor(() => {
				expect(result.current.list.isSuccess).toBe(true);
				expect(result.current.detail.isSuccess).toBe(true);
			});

			await act(async () => {
				await result.current.remove.mutateAsync(1);
			});

			await waitFor(() => expect(cyclesApi.list).toHaveBeenCalledTimes(2));
			expect(cyclesApi.get).toHaveBeenCalledTimes(1);
		});

		it('reloads everything when a delete fails', async () => {
			vi.mocked(cyclesApi.remove).mockRejectedValue(
				new ApiError(409, 'CYCLE_NOT_DRAFT', 'Not a draft.'),
			);
			const { result } = renderHook(
				() => ({ detail: useCycle(1), remove: useDeleteCycle() }),
				{ wrapper: wrapper() },
			);
			await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

			await act(async () => {
				await result.current.remove.mutateAsync(1).catch(() => {});
			});

			await waitFor(() => expect(cyclesApi.get).toHaveBeenCalledTimes(2));
		});
	});
});
