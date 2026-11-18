import { useId } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
	label: string;
	error?: string;
	hint?: ReactNode;
}

export function SelectField({ label, error, hint, id, children, ...select }: SelectFieldProps) {
	const autoId = useId();
	const selectId = id ?? autoId;
	const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

	return (
		<div className={`field${error ? ' field--error' : ''}`}>
			<label htmlFor={selectId}>{label}</label>
			<select
				id={selectId}
				aria-invalid={Boolean(error)}
				aria-describedby={describedBy}
				{...select}
			>
				{children}
			</select>
			{error ? (
				<p className="field__error" id={`${selectId}-error`} role="alert">
					{error}
				</p>
			) : hint ? (
				<div className="field__hint" id={`${selectId}-hint`}>
					{hint}
				</div>
			) : null}
		</div>
	);
}
