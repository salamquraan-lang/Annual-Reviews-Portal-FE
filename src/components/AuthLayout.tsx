import type { ReactNode } from 'react';

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">AR</span>
          <span className="brand__name">Annual Reviews Portal</span>
        </div>
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
        {children}
      </div>
      {footer ? <p className="auth-footer">{footer}</p> : null}
    </main>
  );
}
