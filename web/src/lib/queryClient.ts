import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      placeholderData: (previousData: unknown) => previousData,
    },
    mutations: { retry: 0 },
  },
})
