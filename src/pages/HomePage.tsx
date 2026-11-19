import { useAuth } from '../auth/AuthContext';
import { OpenCycleBanner } from '../components/OpenCycleBanner';
import { ROLE_LABELS } from '../types/auth';

export function HomePage() {
	const { user } = useAuth();
	if (!user) return null;

	return (
		<>
			<h1>Welcome, {user.name.split(' ')[0]}</h1>
			{user.mustChangePassword ? (
				<div className="alert alert--info" role="status">
					You are using a temporary password. Please change it.
				</div>
			) : null}

			<OpenCycleBanner />

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
		</>
	);
}
