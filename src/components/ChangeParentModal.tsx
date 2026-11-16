import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useChangeDepartmentParent } from '../hooks/useDepartmentMutations';
import type { FlatDepartment } from '../utils/departments';
import { DepartmentSelect } from './DepartmentSelect';
import { Modal } from './Modal';

interface ChangeParentModalProps {
	department: FlatDepartment;
	onClose: () => void;
}

export function ChangeParentModal({ department, onClose }: ChangeParentModalProps) {
	const changeParent = useChangeDepartmentParent();
	const [parentId, setParentId] = useState<number | null>(department.parentId);
	const [formError, setFormError] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setFormError(null);

		if (parentId === department.parentId) {
			onClose();
			return;
		}

		try {
			await changeParent.mutateAsync({ id: department.id, parentId });
			onClose();
		} catch (err) {
			if (err instanceof ApiError) {
				switch (err.code) {
					case 'DEPARTMENT_LOOP':
						setFormError('A department cannot be placed under itself or one of its own sub-departments.');
						return;
					case 'PARENT_NOT_FOUND':
						setFormError('The selected parent no longer exists. Close this form and try again.');
						return;
					case 'DEPARTMENT_PARENT_INACTIVE':
						setFormError('The selected parent department is inactive.');
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
		<Modal title={`Change parent of ${department.name}`} onClose={onClose}>
			<form className="form" onSubmit={handleSubmit} noValidate>
				<div className="field">
					<label htmlFor="change-parent-select">Parent department</label>
					<DepartmentSelect
						id="change-parent-select"
						value={parentId}
						onChange={setParentId}
						excludeId={department.id}
					/>
				</div>

				{formError && <p className="form__error">{formError}</p>}

				<div className="form__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" disabled={changeParent.isPending}>
						{changeParent.isPending ? 'Saving…' : 'Save'}
					</button>
				</div>
			</form>
		</Modal>
	);
}
