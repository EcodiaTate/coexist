import {
  CalendarDays,
  Users,
  Settings,
  ShoppingBag,
  Heart,
  Megaphone,
  MapPin,
  Handshake,
  ClipboardList,
  ClipboardCheck,
  FileText,
  Download,
  Mail,
  Bug,
  Image,
  GraduationCap,
  Home,
  Shield,
  Phone,
} from 'lucide-react'
import { createElement } from 'react'
import type { NavCategory, NavItem } from './types'

const icon = (Icon: typeof Home, size = 17) => createElement(Icon, { size, strokeWidth: 1.5 })

export const adminHomeItem: NavItem = { label: 'Admin Home', path: '/admin', icon: icon(Home) }

export const adminNavCategories: NavCategory[] = [
  {
    label: 'People',
    sectionHeader: 'Admin',
    sectionBorderColor: 'border-amber-500',
    labelColor: 'text-amber-600',
    dotColor: 'bg-amber-500',
    items: [
      { label: 'Users', path: '/admin/users', icon: icon(Users), capability: 'manage_users' },
      { label: 'Applications', path: '/admin/applications', icon: icon(ClipboardList), capability: 'manage_users' },
    ],
  },
  {
    label: 'Programme',
    labelColor: 'text-amber-600',
    dotColor: 'bg-amber-500',
    items: [
      { label: 'Collectives', path: '/admin/collectives', icon: icon(MapPin), capability: 'manage_collectives' },
      { label: 'Events', path: '/admin/events', icon: icon(CalendarDays), capability: 'manage_events' },
      { label: 'Partners', path: '/admin/partners', icon: icon(Handshake), capability: 'manage_partners' },
      { label: 'Shop', path: '/admin/shop', icon: icon(ShoppingBag), capability: 'manage_merch' },
      { label: 'Contacts', path: '/admin/contacts', icon: icon(Phone) },
    ],
  },
  {
    label: 'Create',
    labelColor: 'text-amber-600',
    dotColor: 'bg-amber-500',
    items: [
      { label: 'Tasks', path: '/admin/tasks', icon: icon(ClipboardCheck) },
      { label: 'Surveys', path: '/admin/surveys', icon: icon(ClipboardList), capability: 'manage_surveys' },
      { label: 'Email', path: '/admin/email', icon: icon(Mail), capability: 'manage_email' },
      { label: 'Updates', path: '/admin/updates', icon: icon(Megaphone) },
    ],
  },
  {
    label: 'Development',
    labelColor: 'text-amber-600',
    dotColor: 'bg-amber-500',
    items: [
      { label: 'Development', path: '/admin/development', icon: icon(GraduationCap), capability: 'manage_content' },
    ],
  },
  {
    label: 'Settings',
    labelColor: 'text-amber-600',
    dotColor: 'bg-amber-500',
    items: [
      { label: 'Charity', path: '/admin/charity', icon: icon(Heart), capability: 'manage_charity' },
      { label: 'Branding', path: '/admin/branding', icon: icon(Image), capability: 'manage_system' },
      { label: 'Legal Pages', path: '/admin/legal-pages', icon: icon(FileText), capability: 'manage_system' },
      { label: 'System', path: '/admin/system', icon: icon(Settings), capability: 'manage_system' },
    ],
  },
  {
    label: 'Operations',
    labelColor: 'text-amber-600',
    dotColor: 'bg-amber-500',
    items: [
      { label: 'Reports', path: '/admin/reports', icon: icon(FileText), capability: 'view_reports' },
      { label: 'Exports', path: '/admin/exports', icon: icon(Download), capability: 'manage_exports' },
      { label: 'Audit Log', path: '/admin/audit-log', icon: icon(FileText), capability: 'view_audit_log' },
      { label: 'Dev Tools', path: '/admin/dev-tools', icon: icon(Bug), devOnly: true },
    ],
  },
]

// Re-export icon helpers used by the orchestrator for suite identity
export { Shield }
