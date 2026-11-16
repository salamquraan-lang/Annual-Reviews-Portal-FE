import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
	title: string;
	onClose: () => void;
	children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (dialog && !dialog.open) {
			dialog.showModal();
		}
	}, []);

	return (
		<dialog ref={dialogRef} className="modal" onClose={onClose}>
			<div className="modal__header">
				<h2 className="modal__title">{title}</h2>
				<button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
					×
				</button>
			</div>
			<div className="modal__body">{children}</div>
		</dialog>
	);
}
