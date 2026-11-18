import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { CycleStatusBadge } from '../components/CycleStatusBadge';
import { TemplateEditor } from '../components/TemplateEditor';
import { useCycle } from '../hooks/useCycles';
import { useCycleTemplates, useTemplate } from '../hooks/useTemplates';
import type { ReviewType } from '../types/questionBank';
import { REVIEW_TYPES } from '../types/templates';
import { REVIEW_TYPE_LABELS, errorMessage } from '../utils/questionBank';

function NotFound() {
	return (
		<div className="card center">
			<h1>Cycle not found</h1>
			<p className="muted">This cycle does not exist, or it was deleted.</p>
			<Link to="/cycles">Back to cycles</Link>
		</div>
	);
}

function isReviewType(value: string | null): value is ReviewType {
	return value !== null && (REVIEW_TYPES as string[]).includes(value);
}

/** TPL-1: the four forms of one cycle (self, manager, peer, upward), one tab each. Admins only. */
export function TemplatesPage() {
	const { id: idParam } = useParams();
	const parsed = Number(idParam);
	const id = /^\d+$/.test(idParam ?? '') && Number.isSafeInteger(parsed) ? parsed : NaN;
	const cycle = useCycle(id);
	const templates = useCycleTemplates(Number.isInteger(id) ? id : null);

	// The open tab is kept in the address, so a reload or a shared link opens the same form.
	const [searchParams, setSearchParams] = useSearchParams();
	const typeParam = searchParams.get('type');
	const reviewType: ReviewType = isReviewType(typeParam) ? typeParam : 'self';
	const summary = templates.data?.find((template) => template.reviewType === reviewType);
	const template = useTemplate(summary?.id ?? null);

	if (!Number.isInteger(id)) return <NotFound />;
	if (cycle.isPending) return <p className="state-message">Loading cycle…</p>;
	if (cycle.isError) {
		if (cycle.error instanceof ApiError && cycle.error.code === 'CYCLE_NOT_FOUND') return <NotFound />;
		return <p className="state-message state-message--error">{errorMessage(cycle.error, 'Could not load the cycle.')}</p>;
	}

	return (
		<>
			<p className="small">
				<Link to={`/cycles/${id}`}>← Back to {cycle.data.name}</Link>
			</p>

			<div className="page-header">
				<h1>Review forms</h1>
				<div className="page-header__actions">
					<span className="muted">{cycle.data.name}</span>
					<CycleStatusBadge status={cycle.data.status} />
				</div>
			</div>

			<p className="page-intro muted">
				Each review type has its own form. Questions are grouped by criterion, in the order shown.
			</p>

			{templates.isPending && <p className="state-message">Loading forms…</p>}
			{templates.isError && (
				<p className="state-message state-message--error">{errorMessage(templates.error, 'Could not load the forms.')}</p>
			)}

			{templates.data && templates.data.length === 0 && (
				<p className="state-message">This cycle has no forms yet. A cycle gets its four forms when it is created.</p>
			)}

			{templates.data && templates.data.length > 0 && (
				<>
					<div className="tabs" role="tablist" aria-label="Review type">
						{REVIEW_TYPES.map((type) => {
							const item = templates.data.find((t) => t.reviewType === type);
							const selected = type === reviewType;
							return (
								<button
									key={type}
									type="button"
									role="tab"
									aria-selected={selected}
									className={`tabs__tab${selected ? ' tabs__tab--active' : ''}`}
									onClick={() => setSearchParams({ type }, { replace: true })}
								>
									{REVIEW_TYPE_LABELS[type]}
									<span className="tabs__count">{item ? item.questionCount : '—'}</span>
								</button>
							);
						})}
					</div>

					<div role="tabpanel">
						{!summary && (
							<p className="state-message">This cycle has no {REVIEW_TYPE_LABELS[reviewType].toLowerCase()} form.</p>
						)}
						{summary && template.isPending && <p className="state-message">Loading the form…</p>}
						{template.isError && (
							<p className="state-message state-message--error">
								{errorMessage(template.error, 'Could not load the form.')}
							</p>
						)}
						{template.data && <TemplateEditor template={template.data} />}
					</div>
				</>
			)}
		</>
	);
}
