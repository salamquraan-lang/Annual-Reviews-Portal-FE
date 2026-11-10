import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { Alert } from '../components/FormControls';
import { ResendForm } from '../components/ResendVerification';

type State =
  | { kind: 'verifying' }
  | { kind: 'success' }
  | { kind: 'invalid' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

// Links work once and React runs effects twice in dev, so share one request per token.
const inFlight = new Map<string, Promise<void>>();

function verifyOnce(token: string): Promise<void> {
  let p = inFlight.get(token);
  if (!p) {
    p = authApi.verifyEmail(token).then(() => undefined);
    inFlight.set(token, p);
    p.catch(() => inFlight.delete(token));
  }
  return p;
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { status } = useAuth();
  const [token] = useState(() => params.get('token')?.trim() ?? '');
  const [state, setState] = useState<State>(token ? { kind: 'verifying' } : { kind: 'missing' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (params.has('token')) navigate('/verify-email', { replace: true });
  }, [params, navigate]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setState({ kind: 'verifying' });
    verifyOnce(token)
      .then(() => active && setState({ kind: 'success' }))
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && (err.code === 'INVALID_OR_EXPIRED_TOKEN' || err.code === 'VALIDATION_ERROR')) {
          setState({ kind: 'invalid' });
        } else if (err instanceof ApiError && err.code === 'TOO_MANY_REQUESTS') {
          setState({ kind: 'error', message: 'Too many attempts. Please wait a few minutes and try again.' });
        } else {
          setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Something went wrong.' });
        }
      });
    return () => {
      active = false;
    };
  }, [token, attempt]);

  const continueLink = status === 'authenticated' ? <Link to="/">Go to the home page</Link> : <Link to="/login">Back to log in</Link>;

  switch (state.kind) {
    case 'verifying':
      return (
        <AuthLayout title="Verifying your email…">
          <div className="center-block" role="status">
            <span className="spinner" aria-hidden="true" />
            <p className="muted">This takes a moment.</p>
          </div>
        </AuthLayout>
      );

    case 'success':
      return (
        <AuthLayout title="Email verified">
          <Alert kind="success">Your email address is verified. You can log in now.</Alert>
          {status === 'authenticated' ? (
            <Link className="btn btn--primary btn--block" to="/">Go to the home page</Link>
          ) : (
            <Link className="btn btn--primary btn--block" to="/login" state={{ verified: true }}>Log in</Link>
          )}
        </AuthLayout>
      );

    case 'invalid':
      return (
        <AuthLayout title="This link doesn't work" footer={continueLink}>
          <Alert>
            This verification link is invalid, has already been used, or has expired. If you already verified your
            email, just log in.
          </Alert>
          <p className="muted small">Need a new link? Enter your email and we'll send one.</p>
          <ResendForm />
        </AuthLayout>
      );

    case 'missing':
      return (
        <AuthLayout title="Verify your email" footer={continueLink}>
          <p className="muted">
            Open the link from the verification email we sent you. Didn't get one? Enter your email to get a new link.
          </p>
          <ResendForm />
        </AuthLayout>
      );

    case 'error':
      return (
        <AuthLayout title="We couldn't verify your email" footer={continueLink}>
          <Alert>{state.message}</Alert>
          <button type="button" className="btn btn--primary btn--block" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </button>
        </AuthLayout>
      );
  }
}
