import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useUpdateDepartment } from '../hooks/useDepartmentMutations';
import type { DepartmentUpdate } from '../types/departments';
import type { FlatDepartment } from '../utils/departments';
import { Modal } from './Modal';

interface EditDepartmentModalProps {
	department: FlatDepartment;
	onClose: () => void;
}

export function EditDepartmentModal({ department, onClose }: EditDepartmentModalProps) {
	const update = useUpdateDepartment();
	const [name, setName] = useState(department.name);
	const [isActive, setIsActive] = useState(department.isActive);
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

		const data: DepartmentUpdate = {};
		if (trimmed !== department.name) data.name = trimmed;
		if (isActive !== department.isActive) data.isActive = isActive;

		if (Object.keys(data).length === 0) {
			onClose();
			return;
		}

		try {
			await update.mutateAsync({ id: department.id, data });
			onClose();
		} catch (err) {
			if (err instanceof ApiError) {
				switch (err.code) {
					case 'DEPARTMENT_NAME_TAKEN':
						setNameError('A department with this name already exists.');
						return;
					case 'DEPARTMENT_HAS_ACTIVE_USERS':
						setFormError('This department still has active users. Move them to another department first.');
						return;
					case 'DEPARTMENT_HAS_ACTIVE_CHILDREN':
						setFormError('This department still has active sub-departments. Deactivate them first.');
						return;
					case 'DEPARTMENT_PARENT_INACTIVE':
						setFormError('The parent department is inactive. Activate the parent first.');
						return;
					case 'DEPARTMENT_NOT_FOUND':
						setFormError('This department no longer exists. Close this form and refresh the list.');
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
		<Modal title="Edit department" onClose={onClose}>
			<form className="form" onSubmit={handleSubmit} noValidate>
				<div className="field">
					<label htmlFor="edit-department-name">Name</label>
					<input
						id="edit-department-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					{nameError && <p className="field__error">{nameError}</p>}
				</div>

				<label className="checkbox">
					<input
						type="checkbox"
						checked={isActive}
						onChange={(e) => setIsActive(e.target.checked)}
					/>
					Active
				</label>

				{formError && <p className="form__error">{formError}</p>}

				<div className="form__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" disabled={update.isPending}>
						{update.isPending ? 'Saving…' : 'Save'}
					</button>
				</div>
			</form>
		</Modal>
	);
}
