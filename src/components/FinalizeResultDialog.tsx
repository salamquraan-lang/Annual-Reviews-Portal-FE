import type { FinalizeWarning } from '../types/cycles';
import { Alert } from './FormControls';
import { Modal } from './Modal';

interface FinalizeResultDialogProps {
	warnings: FinalizeWarning[];
	onClose: () => void;
}

export function FinalizeResultDialog({ warnings, onClose }: FinalizeResultDialogProps) {
	const count = warnings.length;

	return (
		<Modal title="Cycle finalized" onClose={onClose}>
			<div className="form">
				<Alert kind="success">The cycle is finalized. It can no longer be changed.</Alert>

				{count > 0 ? (
					<div>
						<p>
							{count} {count === 1 ? 'person has' : 'people have'} no result and{' '}
							{count === 1 ? 'gets' : 'get'} no reward proposal.
						</p>
						<ul>
							{warnings.map((warning) => (
								<li key={`${warning.code}-${warning.userId}`}>{warning.message}</li>
							))}
						</ul>
					</div>
				) : (
					<p>No warnings.</p>
				)}

				<div className="form__actions">
					<button type="button" className="button button--primary" onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</Modal>
	);
}
