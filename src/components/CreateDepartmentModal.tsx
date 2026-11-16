import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useCreateDepartment } from '../hooks/useDepartmentMutations';
import { DepartmentSelect } from './DepartmentSelect';
import { Modal } from './Modal';

interface CreateDepartmentModalProps {
	onClose: () => void;
}

export function CreateDepartmentModal({ onClose }: CreateDepartmentModalProps) {
	const create = useCreateDepartment();
	const [name, setName] = useState('');
	const [parentId, setParentId] = useState<number | null>(null);
	const [nameError, setNameError] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setNameError(null);
		setFormError(null);

		const trimmed = name.trim();
		if (!trimmed) {
			setNameError('Enter a department name.');
			return;
		}

		try {
			await create.mutateAsync({ name: trimmed, parentId });
			onClose();
		} catch (err) {
			if (err instanceof ApiError) {
				switch (err.code) {
					case 'DEPARTMENT_NAME_TAKEN':
						setNameError('A department with this name already exists.');
						return;
					case 'PARENT_NOT_FOUND':
						setFormError('The selected parent no longer exists. Close this form and try again.');
						return;
					case 'DEPARTMENT_PARENT_INACTIVE':
						setFormError('The selected parent department is inactive.');
						return;
					default:
						setFormError(err.message);
						return;
				}
			}
			setFormError('Something went wrong. Please try again.');
		}
	}

	return (
		<Modal title="New department" onClose={onClose}>
			<form className="form" onSubmit={handleSubmit} noValidate>
				<div className="field">
					<label htmlFor="department-name">Name</label>
					<input
						id="department-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					{nameError && <p className="field__error">{nameError}</p>}
				</div>

				<div className="field">
					<label htmlFor="department-parent">Parent department</label>
					<DepartmentSelect id="department-parent" value={parentId} onChange={setParentId} />
				</div>

				{formError && <p className="form__error">{formError}</p>}

				<div className="form__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" disabled={create.isPending}>
						{create.isPending ? 'Creating…' : 'Create'}
					</button>
				</div>
			</form>
		</Modal>
	);
}
