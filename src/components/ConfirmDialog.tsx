import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Alert, TextField } from './FormControls';
import { Modal } from './Modal';

interface ConfirmDialogProps {
	title: string;
	confirmLabel: string;
	busyLabel: string;
	isPending: boolean;
	error?: ReactNode;
	confirmText?: string;
	danger?: boolean;
	onConfirm: () => void;
	onClose: () => void;
	children: ReactNode;
}

export function ConfirmDialog({
	title,
	confirmLabel,
	busyLabel,
	isPending,
	error,
	confirmText,
	danger,
	onConfirm,
	onClose,
	children,
}: ConfirmDialogProps) {
	const formRef = useRef<HTMLFormElement>(null);
	const [typed, setTyped] = useState('');
	const canConfirm = confirmText === undefined || typed.trim() === confirmText;

	useEffect(() => {
		const form = formRef.current;
		const target =
			form?.querySelector<HTMLElement>('input') ?? form?.querySelector<HTMLElement>('button');
		target?.focus();
	}, []);

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (canConfirm && !isPending) onConfirm();
	}

	return (
		<Modal title={title} onClose={onClose}>
			<form ref={formRef} className="form" onSubmit={handleSubmit} noValidate>
				<div>{children}</div>

				{confirmText !== undefined && (
					<TextField
						label="Type the cycle name to confirm"
						hint={<strong>{confirmText}</strong>}
						value={typed}
						onChange={(e) => setTyped(e.target.value)}
						autoComplete="off"
						spellCheck={false}
					/>
				)}

				{error ? <Alert>{error}</Alert> : null}

				<div className="form__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button
						type="submit"
						className={`button ${danger ? 'button--danger' : 'button--primary'}`}
						disabled={!canConfirm || isPending}
					>
						{isPending ? busyLabel : confirmLabel}
					</button>
				</div>
			</form>
		</Modal>
	);
}
