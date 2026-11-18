import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { GuestOnly, RequireAuth } from './auth/RouteGuards';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { RequireRole } from './auth/RequireRole';
import { AppLayout } from './components/AppLayout';
import { CyclesPage } from './pages/CyclesPage';
import { CycleDetailPage } from './pages/CycleDetailPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';

function NotFound() {
	return (
		<main className="full-page-center">
			<div className="card center">
				<h1>Page not found</h1>
				<Link to="/">Go to the home page</Link>
			</div>
		</main>
	);
}

export function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<AuthProvider>
					<Routes>
						<Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
						<Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />
						<Route path="/verify-email" element={<VerifyEmailPage />} />
						<Route element={<RequireAuth><AppLayout /></RequireAuth>}>
							<Route path="/" element={<HomePage />} />
							<Route
								path="/departments"
								element={<RequireRole roles={['admin', 'super_admin']}><DepartmentsPage /></RequireRole>}
							/>
							<Route path="/cycles" element={<RequireRole roles={['admin']}><CyclesPage /></RequireRole>} />
							<Route path="/cycles/:id" element={<RequireRole roles={['admin']}><CycleDetailPage /></RequireRole>} />
							<Route
								path="/cycles/:id/templates"
								element={<RequireRole roles={['admin']}><TemplatesPage /></RequireRole>}
							/>
							<Route
								path="/question-bank"
								element={<RequireRole roles={['admin']}><QuestionBankPage /></RequireRole>}
							/>
						</Route>
						<Route path="/home" element={<Navigate to="/" replace />} />
						<Route path="*" element={<NotFound />} />
					</Routes>
				</AuthProvider>
			</BrowserRouter>
		</QueryClientProvider>
	);
}
