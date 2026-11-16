import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useMoveDepartmentUsers } from '../hooks/useDepartmentMutations';
import type { FlatDepartment } from '../utils/departments';
import { DepartmentSelect } from './DepartmentSelect';
import { Modal } from './Modal';

interface MoveUsersModalProps {
	department: FlatDepartment;
	onClose: () => void;
}

export function MoveUsersModal({ department, onClose }: MoveUsersModalProps) {
	const moveUsers = useMoveDepartmentUsers();
	const [targetId, setTargetId] = useState<number | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [movedCount, setMovedCount] = useState<number | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setFormError(null);

		if (targetId === null) {
			setFormError('Choose the department to move the users to.');
			return;
		}
		if (targetId === department.id) {
			setFormError('Choose a different department.');
			return;
		}

		try {
			const result = await moveUsers.mutateAsync({
				id: department.id,
				targetDepartmentId: targetId,
			});
			setMovedCount(result.movedCount);
		} catch (err) {
			if (err instanceof ApiError) {
				switch (err.code) {
					case 'TARGET_NOT_FOUND':
						setFormError('The selected department no longer exists. Close this form and try again.');
						return;
					case 'SAME_DEPARTMENT':
						setFormError('Choose a different department.');
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

	if (movedCount !== null) {
		return (
			<Modal title={`Move users from ${department.name}`} onClose={onClose}>
				<div className="form">
					<p>
						{movedCount === 0
							? 'There were no users to move.'
							: `${movedCount} ${movedCount === 1 ? 'user was' : 'users were'} moved.`}
					</p>
					<div className="form__actions">
						<button type="button" className="button button--primary" onClick={onClose}>
							Close
						</button>
					</div>
				</div>
			</Modal>
		);
	}

	return (
		<Modal title={`Move users from ${department.name}`} onClose={onClose}>
			<form className="form" onSubmit={handleSubmit} noValidate>
				<div className="field">
					<label htmlFor="move-users-target">Move users to</label>
					<DepartmentSelect
						id="move-users-target"
						value={targetId}
						onChange={setTargetId}
						placeholder="Choose a department"
					/>
				</div>

				{formError && <p className="form__error">{formError}</p>}

				<div className="form__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" disabled={moveUsers.isPending}>
						{moveUsers.isPending ? 'Moving…' : 'Move users'}
					</button>
				</div>
			</form>
		</Modal>
	);
}
