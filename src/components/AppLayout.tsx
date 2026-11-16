import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS, type Role } from '../types/auth';

interface NavItem {
	label: string;
	to: string;
	roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
	{ label: 'Home', to: '/' },
	{ label: 'Departments', to: '/departments', roles: ['admin', 'super_admin'] },
	{ label: 'Cycles', to: '/cycles', roles: ['admin'] },
];

export function AppLayout() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [busy, setBusy] = useState(false);
	if (!user) return null;

	async function onLogout() {
		setBusy(true);
		await logout();
		navigate('/login', { replace: true });
	}

	const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

	return (
		<div className="app-shell">
			<header className="topbar">
				<div className="brand">
					<span className="brand__mark" aria-hidden="true">AR</span>
					<span className="brand__name">Annual Reviews Portal</span>
				</div>
				<div className="topbar__user">
					<span className="topbar__name">{user.name}</span>
					<span className="topbar__role">{ROLE_LABELS[user.role]}</span>
					<button className="btn btn--ghost" onClick={onLogout} disabled={busy}>
						{busy ? 'Logging out…' : 'Log out'}
					</button>
				</div>
			</header>

			<div className="app-body">
				<nav className="sidebar" aria-label="Main">
					{items.map((item) => (
						<NavLink key={item.to} to={item.to} end={item.to === '/'} className="sidebar__link">
							{item.label}
						</NavLink>
					))}
				</nav>
				<main className="content">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
