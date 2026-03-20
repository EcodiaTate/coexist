import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Celebration } from '@/components/celebration'

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    motion: {
      ...actual.motion,
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
      p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    },
    useReducedMotion: () => true,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

// Mock Confetti
vi.mock('@/components/confetti', () => ({
  Confetti: () => <div data-testid="confetti" />,
}))

describe('Celebration', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when closed', () => {
    render(
      <Celebration open={false} onClose={onClose} title="Badge Unlocked!" />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders dialog when open', () => {
    render(
      <Celebration open onClose={onClose} title="Badge Unlocked!" />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Badge Unlocked!')
  })

  it('renders title', () => {
    render(
      <Celebration open onClose={onClose} title="Level Up!" />,
    )
    expect(screen.getByText('Level Up!')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(
      <Celebration
        open
        onClose={onClose}
        title="Badge Unlocked!"
        subtitle="You earned the Tree Hugger badge"
      />,
    )
    expect(screen.getByText('You earned the Tree Hugger badge')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(
      <Celebration
        open
        onClose={onClose}
        title="Test"
        icon={<span data-testid="icon">🏆</span>}
      />,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('auto-dismisses after autoDismiss delay', () => {
    render(
      <Celebration open onClose={onClose} title="Test" autoDismiss={3000} />,
    )
    expect(onClose).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not auto-dismiss when autoDismiss is 0', () => {
    render(
      <Celebration open onClose={onClose} title="Test" autoDismiss={0} />,
    )
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when clicked', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    render(
      <Celebration open onClose={onClose} title="Test" autoDismiss={0} />,
    )
    await user.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows tap to dismiss hint', () => {
    render(
      <Celebration open onClose={onClose} title="Test" />,
    )
    expect(screen.getByText('Tap anywhere to continue')).toBeInTheDocument()
  })
})
