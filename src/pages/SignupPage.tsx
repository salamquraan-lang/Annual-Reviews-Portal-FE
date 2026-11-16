import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { EMAIL_PATTERN, PASSWORD_RULES, passwordProblem } from '../auth/passwordRules';
import { AuthLayout } from '../components/AuthLayout';
import { Alert, PasswordField, SubmitButton, TextField } from '../components/FormControls';
import { ResendButton } from '../components/ResendVerification';

type Field = 'name' | 'email' | 'password' | 'confirm';
type Errors = Partial<Record<Field, string>>;

export function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: undefined }));
  };

  function validate(): Errors {
    const e: Errors = {};
    const name = form.name.trim();
    if (name.length < 2) e.name = 'Name must be at least 2 characters.';
    else if (name.length > 120) e.name = 'Name must be at most 120 characters.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!EMAIL_PATTERN.test(form.email.trim())) e.email = 'Enter a valid email address.';
    const pw = passwordProblem(form.password);
    if (pw) e.password = pw;
    if (!form.confirm) e.confirm = 'Please repeat the password.';
    else if (form.confirm !== form.password) e.confirm = 'The passwords do not match.';
    return e;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      const email = form.email.trim();
      await authApi.signup({ name: form.name.trim(), email, password: form.password });
      setSentTo(email);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && err.fieldErrors.length) {
        const fromServer: Errors = {};
        for (const fe of err.fieldErrors) {
          const key = fe.field as Field;
          if (!fromServer[key]) fromServer[key] = fe.message;
        }
        setErrors(fromServer);
      } else if (err instanceof ApiError && err.code === 'TOO_MANY_REQUESTS') {
        setFormError('Too many attempts. Please wait a few minutes and try again.');
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" footer={<Link to="/login">Back to log in</Link>}>
        <Alert kind="success">
          We sent a verification link to <strong>{sentTo}</strong>. Open it to activate your account, then log in.
        </Alert>
        <p className="muted small">
          The link expires in 24 hours. If you don't see the email, check your spam folder.
        </p>
        <ResendButton email={sentTo} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Sign up with your work email."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="form">
        {formError ? <Alert>{formError}</Alert> : null}
        <TextField label="Full name" autoComplete="name" autoFocus value={form.name} onChange={set('name')} error={errors.name} />
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint={
            <ul className="rules">
              {PASSWORD_RULES.filter((r) => r.label !== 'At most 72 characters').map((r) => {
                const ok = form.password.length > 0 && r.test(form.password);
                return (
                  <li key={r.label} className={ok ? 'rules__ok' : undefined}>
                    <span aria-hidden="true">{ok ? '✓' : '•'}</span> {r.label}
                  </li>
                );
              })}
            </ul>
          }
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
        />
        <SubmitButton loading={loading}>{loading ? 'Creating account…' : 'Create account'}</SubmitButton>
      </form>
    </AuthLayout>
  );
}
