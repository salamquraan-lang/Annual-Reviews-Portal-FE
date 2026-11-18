import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';

function LocationProbe() {
	const location = useLocation();
	return <span data-testid="location">{location.pathname + location.search}</span>;
}

export function renderWithProviders(ui: ReactElement, route = '/') {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Infinity },
			mutations: { retry: false },
		},
	});

	const result = render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[route]}>
				{ui}
				<LocationProbe />
			</MemoryRouter>
		</QueryClientProvider>,
	);

	return { ...result, queryClient };
}
