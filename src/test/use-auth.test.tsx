import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// We test the auth context via the provider since useAuth is context-based.
// The supabase mock is set up in setup.ts.

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    )
  }
}

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides default unauthenticated state', async () => {
    // Import dynamically so mocks are applied
    const { useAuth } = await import('@/hooks/use-auth')
    const { AuthProvider } = await import('@/components/auth-provider')

    const Wrapper = createWrapper()
    const WrapperWithAuth = ({ children }: { children: ReactNode }) => (
      <Wrapper>
        <AuthProvider>{children}</AuthProvider>
      </Wrapper>
    )

    const { result } = renderHook(() => useAuth(), { wrapper: WrapperWithAuth })

    // Initially loading, then resolves to no user
    await waitFor(() => {
      expect(result.current.user).toBeNull()
    })
  })
})
