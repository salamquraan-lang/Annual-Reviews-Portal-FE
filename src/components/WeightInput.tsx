import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { MAX_WEIGHT } from '../types/templates';
import { parseWeight } from '../utils/templates';

interface WeightInputProps {
	value: number;
	label: string;
	disabled: boolean;
	onSave: (weight: number) => void;
}

/** A question's weight. It is saved when the field loses focus or Enter is pressed. */
export function WeightInput({ value, label, disabled, onSave }: WeightInputProps) {
	const [text, setText] = useState(String(value));
	const [error, setError] = useState<string | null>(null);

	// Follow the saved value, for example after a copy or after someone else changed it.
	useEffect(() => {
		setText(String(value));
		setError(null);
	}, [value]);

	function save() {
		const weight = parseWeight(text, MAX_WEIGHT);
		if (weight === null) {
			setError(`A whole number from 1 to ${MAX_WEIGHT}.`);
			return;
		}
		setError(null);
		if (weight !== value) onSave(weight);
	}

	function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') {
			e.preventDefault();
			save();
		} else if (e.key === 'Escape') {
			setText(String(value));
			setError(null);
		}
	}

	return (
		<span className="weight-input">
			<input
				type="number"
				inputMode="numeric"
				min={1}
				max={MAX_WEIGHT}
				step={1}
				value={text}
				aria-label={label}
				aria-invalid={Boolean(error)}
				disabled={disabled}
				onChange={(e) => setText(e.target.value)}
				onBlur={save}
				onKeyDown={handleKeyDown}
			/>
			{error && (
				<span className="field__error" role="alert">
					{error}
				</span>
			)}
		</span>
	);
}
