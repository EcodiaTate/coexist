/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { ToastProvider } from '@/components/toast'


const { axe } = await import('vitest-axe') as unknown as { axe: (container: HTMLElement) => Promise<unknown> }

// Mock framer-motion to render plain elements for axe testing
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    motion: {
      ...actual.motion,
      button: ({
        children,
        whileTap,
        transition,
        ...props
      }: Record<string, unknown> & { children?: React.ReactNode }) => <button {...props}>{children}</button>,
      div: ({
        children,
        variants,
        initial,
        animate,
        exit,
        whileTap,
        layout,
        ...props
      }: Record<string, unknown> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
    },
    useReducedMotion: () => true,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

describe('Accessibility audit (axe-core)', () => {
  it('Button: no violations for primary button', async () => {
    const { container } = render(<Button>Submit</Button>)
    const results = await axe(container);
    (expect(results) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations()
  })

  it('Button: no violations when disabled', async () => {
    const { container } = render(<Button disabled>Disabled</Button>)
    const results = await axe(container);
    (expect(results) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations()
  })

  it('Button: no violations when loading', async () => {
    const { container } = render(<Button loading>Saving</Button>)
    const results = await axe(container);
    (expect(results) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations()
  })

  it('Button: no violations for icon-only with aria-label', async () => {
    const { container } = render(
      <Button aria-label="Close" icon={<span>×</span>} />,
    )
    const results = await axe(container);
    (expect(results) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations()
  })

  it('Button: secondary variant no violations', async () => {
    const { container } = render(<Button variant="secondary">Cancel</Button>)
    const results = await axe(container);
    (expect(results) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations()
  })

  it('Button: danger variant no violations', async () => {
    const { container } = render(<Button variant="danger">Delete</Button>)
    const results = await axe(container);
    (expect(results) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations()
  })

  it('Badge: activity variant no violations', async () => {
    const { container } = render(
      <Badge variant="activity" activity="tree-planting">Tree Planting</Badge>,
    )
    const results = await axe(container);
    (expect(results) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations()
  })

  it('Badge: tier variant no violations', async () => {
    const { container } = render(
      <Badge variant="tier" tier="dedicated">Dedicated</Badge>,
    )
    const results = await axe(container);
    (expect(results) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations()
  })

  it('ToastProvider: notification container no violations', async () => {
    const { container } = render(
      <ToastProvider>
        <button>Trigger</button>
      </ToastProvider>,
    )
    const results = await axe(container);
    (expect(results) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations()
  })

  it('Button: all sizes have no violations', async () => {
    const { container } = render(
      <div>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>,
    )
    const results = await axe(container);
    (expect(results) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations()
  })
})
