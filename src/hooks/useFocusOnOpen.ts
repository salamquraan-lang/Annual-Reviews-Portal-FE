import { useEffect, useRef } from 'react';

/**
 * Focuses an element once its dialog is open. React's autoFocus is not enough inside a <dialog>:
 * showModal() runs after the children mount and moves the focus to the dialog's first button.
 */
export function useFocusOnOpen<T extends HTMLElement>() {
	const ref = useRef<T>(null);

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => ref.current?.focus());
		return () => window.cancelAnimationFrame(frame);
	}, []);

	return ref;
}
