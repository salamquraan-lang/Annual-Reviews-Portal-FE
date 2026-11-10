import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS } from '../types/auth';

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  async function onLogout() {
    setBusy(true);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">AR</span>
          <span className="brand__name">Annual Reviews Portal</span>
        </div>
        <button className="btn btn--ghost" onClick={onLogout} disabled={busy}>
          {busy ? 'Logging out…' : 'Log out'}
        </button>
      </header>

      <main className="content">
        <h1>Welcome, {user.name.split(' ')[0]}</h1>
        {user.mustChangePassword ? (
          <div className="alert alert--info" role="status">
            You are using a temporary password. Please change it.
          </div>
        ) : null}

        <section className="card" aria-labelledby="profile-heading">
          <h2 id="profile-heading">Your profile</h2>
          <dl className="details">
            <dt>Name</dt>
            <dd>{user.name}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Role</dt>
            <dd>{ROLE_LABELS[user.role]}</dd>
            <dt>Department</dt>
            <dd>{user.department?.name ?? '—'}</dd>
            <dt>Manager</dt>
            <dd>{user.manager?.name ?? '—'}</dd>
          </dl>
        </section>
      </main>
    </div>
  );
}
