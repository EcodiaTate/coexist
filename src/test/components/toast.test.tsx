/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '@/components/toast'

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    motion: {
      ...actual.motion,
      div: ({ children, layout, ...props }: any) => <div {...props}>{children}</div>,
    },
    useReducedMotion: () => true,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

function TestConsumer() {
  const { toast } = useToast()
  return (
    <div>
      <button onClick={() => toast.success('Saved!')}>Success</button>
      <button onClick={() => toast.error('Failed!')}>Error</button>
      <button onClick={() => toast.info('FYI')}>Info</button>
      <button onClick={() => toast.warning('Careful!')}>Warning</button>
    </div>
  )
}

describe('Toast system', () => {
  it('throws when useToast is used outside provider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow(
      'useToast must be used within a <ToastProvider>',
    )
    spy.mockRestore()
  })

  it('renders a success toast', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )
    await user.click(screen.getByText('Success'))
    expect(screen.getByRole('alert')).toHaveTextContent('Saved!')
  })

  it('renders an error toast', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )
    await user.click(screen.getByText('Error'))
    expect(screen.getByRole('alert')).toHaveTextContent('Failed!')
  })

  it('renders multiple toasts', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )
    await user.click(screen.getByText('Success'))
    await user.click(screen.getByText('Error'))
    expect(screen.getAllByRole('alert')).toHaveLength(2)
  })

  it('has a notifications container with aria-live', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )
    expect(screen.getByLabelText('Notifications')).toHaveAttribute('aria-live', 'polite')
  })

  it('dismiss button has accessible label', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )
    await user.click(screen.getByText('Info'))
    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument()
  })

  it('dismisses toast when dismiss button clicked', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )
    await user.click(screen.getByText('Warning'))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Dismiss notification'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
