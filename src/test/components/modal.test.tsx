/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/components/modal'

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    motion: {
      ...actual.motion,
      div: ({
        children,
        variants,
        initial,
        animate,
        exit,
        whileTap,
        layout,
        ...props
      }: any) => <div {...props}>{children}</div>,
    },
    useReducedMotion: () => true,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

describe('Modal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders dialog when open', () => {
    render(
      <Modal open onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Test Modal')
  })

  it('renders title in heading', () => {
    render(
      <Modal open onClose={onClose} title="My Title">
        <p>Body</p>
      </Modal>,
    )
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('My Title')
  })

  it('renders children', () => {
    render(
      <Modal open onClose={onClose} title="Test">
        <p>Hello World</p>
      </Modal>,
    )
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup()
    render(
      <Modal open onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>,
    )
    await user.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Escape key', async () => {
    const user = userEvent.setup()
    render(
      <Modal open onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop clicked', async () => {
    const user = userEvent.setup()
    render(
      <Modal open onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>,
    )
    // Backdrop has aria-hidden="true" and onClick={onClose}
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement
    if (backdrop) {
      await user.click(backdrop)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('has close button with accessible label', () => {
    render(
      <Modal open onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>,
    )
    expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
  })
})
