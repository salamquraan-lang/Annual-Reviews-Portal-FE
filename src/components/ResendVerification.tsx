import { useState, type FormEvent } from 'react';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { EMAIL_PATTERN } from '../auth/passwordRules';
import { Alert, SubmitButton, TextField } from './FormControls';

const COOLDOWN_SECONDS = 30;

function errorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code === 'TOO_MANY_REQUESTS') {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
}

function useCooldown() {
  const [left, setLeft] = useState(0);
  function start() {
    setLeft(COOLDOWN_SECONDS);
    const timer = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) window.clearInterval(timer);
        return s - 1;
      });
    }, 1000);
  }
  return { left, start };
}

export function ResendButton({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cooldown = useCooldown();

  async function resend() {
    setLoading(true);
    setError(null);
    try {
      await authApi.resendVerification(email);
      setSent(true);
      cooldown.start();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="resend">
      {sent ? <Alert kind="success">We sent a new verification link. Check your inbox.</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}
      <button type="button" className="btn btn--ghost btn--block" onClick={resend} disabled={loading || cooldown.left > 0}>
        {loading
          ? 'Sending…'
          : cooldown.left > 0
            ? `Send again in ${cooldown.left}s`
            : sent
              ? 'Send the link again'
              : 'Resend verification email'}
      </button>
    </div>
  );
}

export function ResendForm() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setFieldError('Enter a valid email address.');
      return;
    }
    setFieldError(undefined);
    setLoading(true);
    try {
      await authApi.resendVerification(value);
      setSentTo(value);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <Alert kind="success">
        If <strong>{sentTo}</strong> has an account that still needs verification, we sent a new link to it.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="form">
      {error ? <Alert>{error}</Alert> : null}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldError}
      />
      <SubmitButton loading={loading}>{loading ? 'Sending…' : 'Send me a new link'}</SubmitButton>
    </form>
  );
}
