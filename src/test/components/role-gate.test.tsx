import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoleGate } from '@/components/role-gate'

// Mock useAuth
const mockAuth = {
  role: 'participant' as string,
  isLoading: false,
}
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockAuth,
}))

// Mock useCollectiveRole
const mockCollectiveRole = {
  hasMinRole: vi.fn(() => false),
  isLoading: false,
}
vi.mock('@/hooks/use-collective-role', () => ({
  useCollectiveRole: () => mockCollectiveRole,
}))

describe('RoleGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.role = 'participant'
    mockAuth.isLoading = false
    mockCollectiveRole.hasMinRole = vi.fn(() => false)
    mockCollectiveRole.isLoading = false
  })

  describe('global role checks', () => {
    it('renders children when user meets minimum global role', () => {
      mockAuth.role = 'national_admin'
      render(
        <RoleGate minRole="national_staff">
          <p>Admin content</p>
        </RoleGate>,
      )
      expect(screen.getByText('Admin content')).toBeInTheDocument()
    })

    it('hides children when user does not meet minimum global role', () => {
      mockAuth.role = 'participant'
      render(
        <RoleGate minRole="national_admin">
          <p>Hidden content</p>
        </RoleGate>,
      )
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
    })

    it('renders fallback when user does not meet role', () => {
      mockAuth.role = 'participant'
      render(
        <RoleGate minRole="national_admin" fallback={<p>No access</p>}>
          <p>Admin only</p>
        </RoleGate>,
      )
      expect(screen.queryByText('Admin only')).not.toBeInTheDocument()
      expect(screen.getByText('No access')).toBeInTheDocument()
    })

    it('super_admin meets all global roles', () => {
      mockAuth.role = 'super_admin'
      render(
        <RoleGate minRole="national_admin">
          <p>Visible</p>
        </RoleGate>,
      )
      expect(screen.getByText('Visible')).toBeInTheDocument()
    })

    it('exact role match works', () => {
      mockAuth.role = 'national_staff'
      render(
        <RoleGate minRole="national_staff">
          <p>Staff content</p>
        </RoleGate>,
      )
      expect(screen.getByText('Staff content')).toBeInTheDocument()
    })
  })

  describe('collective role checks', () => {
    it('renders children when collective role met', () => {
      mockCollectiveRole.hasMinRole = vi.fn(() => true)
      render(
        <RoleGate minRole="leader" collectiveId="col-1">
          <p>Leader tools</p>
        </RoleGate>,
      )
      expect(screen.getByText('Leader tools')).toBeInTheDocument()
    })

    it('hides children when collective role not met', () => {
      mockCollectiveRole.hasMinRole = vi.fn(() => false)
      render(
        <RoleGate minRole="leader" collectiveId="col-1">
          <p>Leader tools</p>
        </RoleGate>,
      )
      expect(screen.queryByText('Leader tools')).not.toBeInTheDocument()
    })

    it('renders fallback for insufficient collective role', () => {
      mockCollectiveRole.hasMinRole = vi.fn(() => false)
      render(
        <RoleGate minRole="co_leader" collectiveId="col-1" fallback={<p>Members only</p>}>
          <p>Co-leader content</p>
        </RoleGate>,
      )
      expect(screen.getByText('Members only')).toBeInTheDocument()
    })
  })

  describe('loading states', () => {
    it('renders nothing while auth is loading', () => {
      mockAuth.isLoading = true
      render(
        <RoleGate minRole="participant">
          <p>Content</p>
        </RoleGate>,
      )
      expect(screen.queryByText('Content')).not.toBeInTheDocument()
    })

    it('renders nothing while collective role is loading', () => {
      mockCollectiveRole.isLoading = true
      render(
        <RoleGate minRole="leader" collectiveId="col-1">
          <p>Content</p>
        </RoleGate>,
      )
      expect(screen.queryByText('Content')).not.toBeInTheDocument()
    })
  })
})
