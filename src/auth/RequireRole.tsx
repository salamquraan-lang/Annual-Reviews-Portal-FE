import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { Role } from '../types/auth';

function NotAllowed() {
	return (
		<div className="card center">
			<h1>You can't open this page</h1>
			<p className="muted">Your role does not have access to it.</p>
			<Link to="/">Go to the home page</Link>
		</div>
	);
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
	const { user } = useAuth();
	if (!user) return null;
	if (!roles.includes(user.role)) return <NotAllowed />;
	return <>{children}</>;
}
