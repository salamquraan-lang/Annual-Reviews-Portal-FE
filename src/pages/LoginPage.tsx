import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { EMAIL_PATTERN } from '../auth/passwordRules';
import { AuthLayout } from '../components/AuthLayout';
import { Alert, PasswordField, SubmitButton, TextField } from '../components/FormControls';
import { ResendButton } from '../components/ResendVerification';

type Errors = Partial<Record<'email' | 'password', string>>;

function messageFor(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.';
  switch (err.code) {
    case 'INVALID_CREDENTIALS':
      return 'Email or password is incorrect.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Please verify your email address first. Check your inbox for the link we sent you.';
    case 'TOO_MANY_REQUESTS':
      return 'Too many attempts. Please wait a few minutes and try again.';
    default:
      return err.message;
  }
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { from?: string; verified?: boolean } | null;
  const from = navState?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): Errors {
    const e: Errors = {};
    if (!email.trim()) e.email = 'Email is required.';
    else if (!EMAIL_PATTERN.test(email.trim())) e.email = 'Enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    return e;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setUnverifiedEmail(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(messageFor(err));
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') setUnverifiedEmail(email.trim());
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back. Log in to see your reviews."
      footer={
        <>
          New here? <Link to="/signup">Create an account</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="form">
        {navState?.verified && !formError ? (
          <Alert kind="success">Your email is verified. Log in to continue.</Alert>
        ) : null}
        {formError ? <Alert>{formError}</Alert> : null}
        {unverifiedEmail ? <ResendButton key={unverifiedEmail} email={unverifiedEmail} /> : null}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <SubmitButton loading={loading}>{loading ? 'Logging in…' : 'Log in'}</SubmitButton>
      </form>
    </AuthLayout>
  );
}
