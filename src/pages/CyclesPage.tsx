import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { CycleFormModal } from '../components/CycleFormModal';
import { CycleStatusBadge } from '../components/CycleStatusBadge';
import { Pagination } from '../components/Pagination';
import { useCycles } from '../hooks/useCycles';
import {
	CYCLE_STATUSES,
	CYCLE_STATUS_LABELS,
	CYCLE_TYPES,
	CYCLE_TYPE_LABELS,
} from '../types/cycles';
import type { CycleListParams } from '../types/cycles';
import { formatDate, parseCycleFilters, parseYear } from '../utils/cycles';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 6;

export function CyclesPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const filters = parseCycleFilters(searchParams);
	const page = filters.page ?? 1;
	const params: CycleListParams = { ...filters, page, pageSize: PAGE_SIZE };
	const { data, isPending, isError, error, isPlaceholderData } = useCycles(params);

	const [creating, setCreating] = useState(false);
	const [yearText, setYearText] = useState(filters.year?.toString() ?? '');
	const [syncedYear, setSyncedYear] = useState(filters.year);
	if (filters.year !== syncedYear) {
		setSyncedYear(filters.year);
		if (parseYear(yearText.trim()) !== filters.year) {
			setYearText(filters.year?.toString() ?? '');
		}
	}

	const hasFilters =
		filters.status !== undefined || filters.type !== undefined || filters.year !== undefined;
	const total = data?.total ?? 0;
	const countText = hasFilters
		? `${total} ${total === 1 ? 'cycle matches' : 'cycles match'} your filters`
		: `${total} ${total === 1 ? 'cycle' : 'cycles'}`;

	function updateParams(changes: Record<string, string | undefined>) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			for (const [key, value] of Object.entries(changes)) {
				if (value === undefined) next.delete(key);
				else next.set(key, value);
			}
			return next;
		});
	}

	function changeFilter(changes: Record<string, string | undefined>) {
		updateParams({ ...changes, page: undefined });
	}

	function changePage(newPage: number) {
		updateParams({ page: newPage > 1 ? String(newPage) : undefined });
	}

	function handleYearChange(value: string) {
		setYearText(value);
		const nextYear = parseYear(value.trim());
		if (nextYear !== filters.year) changeFilter({ year: nextYear?.toString() });
	}

	function clearFilters() {
		setSearchParams({});
	}

	return (
		<>
			<div className="page-header">
				<h1>Review cycles</h1>
				<button type="button" className="button button--primary" onClick={() => setCreating(true)}>
					New cycle
				</button>
			</div>

			<div className="toolbar">
				<label className="toolbar__field">
					Status
					<select
						value={filters.status ?? ''}
						onChange={(e) => changeFilter({ status: e.target.value || undefined })}
					>
						<option value="">All</option>
						{CYCLE_STATUSES.map((status) => (
							<option key={status} value={status}>
								{CYCLE_STATUS_LABELS[status]}
							</option>
						))}
					</select>
				</label>

				<label className="toolbar__field">
					Type
					<select
						value={filters.type ?? ''}
						onChange={(e) => changeFilter({ type: e.target.value || undefined })}
					>
						<option value="">All</option>
						{CYCLE_TYPES.map((type) => (
							<option key={type} value={type}>
								{CYCLE_TYPE_LABELS[type]}
							</option>
						))}
					</select>
				</label>

				<label className="toolbar__field">
					Year
					<input
						type="text"
						inputMode="numeric"
						maxLength={4}
						placeholder="e.g. 2026"
						value={yearText}
						onChange={(e) => handleYearChange(e.target.value)}
					/>
				</label>

				{hasFilters && (
					<button type="button" className="button" onClick={clearFilters}>
						Clear filters
					</button>
				)}
			</div>

			{isPending && <p className="state-message">Loading cycles…</p>}

			{isError && (
				<p className="state-message state-message--error">
					{error instanceof ApiError ? error.message : 'Could not load cycles.'}
				</p>
			)}

			{data && !isError && (
				<>
					<p className="toolbar__count">{countText}</p>

					<div className="table-wrap" aria-busy={isPlaceholderData}>
						<table className="table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Type</th>
									<th>Year</th>
									<th>Start</th>
									<th>End</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{data.items.length === 0 ? (
									<tr>
										<td colSpan={COLUMN_COUNT} className="table__empty">
											{data.total === 0 ? (
												<>
													<p>{hasFilters ? 'No cycles match your filters.' : 'No cycles yet. Create the first one with New cycle.'}</p>
													{hasFilters && (
														<button type="button" className="button" onClick={clearFilters}>
															Clear filters
														</button>
													)}
												</>
											) : (
												<>
													<p>This page is empty.</p>
													<button type="button" className="button" onClick={() => changePage(1)}>
														Go to the first page
													</button>
												</>
											)}
										</td>
									</tr>
								) : (
									data.items.map((cycle) => (
										<tr key={cycle.id}>
											<td>
												<Link to={`/cycles/${cycle.id}`}>{cycle.name}</Link>
											</td>
											<td>{CYCLE_TYPE_LABELS[cycle.type]}</td>
											<td>{cycle.year}</td>
											<td>{formatDate(cycle.startDate)}</td>
											<td>{formatDate(cycle.endDate)}</td>
											<td>
												<CycleStatusBadge status={cycle.status} />
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{data.total > PAGE_SIZE && (
						<Pagination
							page={page}
							pageSize={PAGE_SIZE}
							total={data.total}
							onPageChange={changePage}
						/>
					)}
				</>
			)}
			{creating && <CycleFormModal mode={{ kind: 'create' }} onClose={() => setCreating(false)} />}
		</>
	);
}
