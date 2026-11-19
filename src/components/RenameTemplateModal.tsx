import { useState } from 'react';
import type { FormEvent } from 'react';
import { useFocusOnOpen } from '../hooks/useFocusOnOpen';
import { fieldErrors, errorMessage } from '../utils/questionBank';
import { Alert } from './FormControls';
import { Modal } from './Modal';

const NAME_MAX = 150;

interface RenameTemplateModalProps {
	name: string;
	isPending: boolean;
	error: unknown;
	onSave: (name: string) => void;
	onClose: () => void;
}

export function RenameTemplateModal({ name: current, isPending, error, onSave, onClose }: RenameTemplateModalProps) {
	const [name, setName] = useState(current);
	const [nameError, setNameError] = useState<string | null>(null);
	const serverNameError = fieldErrors(error).name;
	const shownError = nameError ?? serverNameError;
	const nameRef = useFocusOnOpen<HTMLInputElement>();

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setNameError(null);
		const trimmed = name.trim();
		if (!trimmed) {
			setNameError('Enter a name.');
			return;
		}
		if (trimmed === current) {
			onClose();
			return;
		}
		onSave(trimmed);
	}

	return (
		<Modal title="Rename form" onClose={onClose}>
			<form className="form" onSubmit={handleSubmit} noValidate>
				<div className={`field${shownError ? ' field--error' : ''}`}>
					<label htmlFor="template-name-input">Name</label>
					<input
						id="template-name-input"
						ref={nameRef}
						type="text"
						value={name}
						maxLength={NAME_MAX}
						aria-invalid={Boolean(shownError)}
						onChange={(e) => setName(e.target.value)}
					/>
					{shownError && <p className="field__error">{shownError}</p>}
				</div>
				{error && !serverNameError ? <Alert>{errorMessage(error)}</Alert> : null}
				<div className="form__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" disabled={isPending}>
						{isPending ? 'Saving…' : 'Save'}
					</button>
				</div>
			</form>
		</Modal>
	);
}
