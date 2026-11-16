import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export function TextField({ label, error, hint, id, ...input }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...input} />
      {error ? (
        <p className="field__error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <div className="field__hint" id={`${inputId}-hint`}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function PasswordField(props: Omit<TextFieldProps, 'type'>) {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const inputId = props.id ?? autoId;
  const describedBy = props.error ? `${inputId}-error` : props.hint ? `${inputId}-hint` : undefined;
  const { label, error, hint, ...input } = props;
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={inputId}>{label}</label>
      <div className="password-input">
        <input
          {...input}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="password-input__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error ? (
        <p className="field__error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <div className="field__hint" id={`${inputId}-hint`}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  return (
    <div className={`alert alert--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button type="submit" className="btn btn--primary btn--block" disabled={loading} aria-busy={loading}>
      {loading ? <span className="spinner spinner--small" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
