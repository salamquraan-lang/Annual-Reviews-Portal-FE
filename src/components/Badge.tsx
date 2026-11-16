import type { ReactNode } from 'react';

export type BadgeTone = 'success' | 'neutral' | 'warning' | 'danger' | 'info';

interface BadgeProps {
	tone: BadgeTone;
	children: ReactNode;
}

export function Badge({ tone, children }: BadgeProps) {
	return <span className={`badge badge--${tone}`}>{children}</span>;
}
