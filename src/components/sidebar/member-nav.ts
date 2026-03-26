import {
  CalendarDays,
  ShoppingBag,
  Heart,
  Megaphone,
  Users,
  Handshake,
  Mail,
  MessageCircle,
  Home,
} from 'lucide-react'
import { createElement } from 'react'
import type { NavCategory, NavItem } from './types'

const icon = (Icon: typeof Home, size = 17) => createElement(Icon, { size, strokeWidth: 1.5 })

export const memberHomeItem: NavItem = { label: 'Home', path: '/', icon: icon(Home) }

export const mainNavCategories: NavCategory[] = [
  {
    label: 'Browse',
    sectionHeader: 'Member',
    sectionBorderColor: 'border-primary-400',
    labelColor: 'text-primary-400',
    dotColor: 'bg-primary-400',
    items: [
      { label: 'Updates', path: '/updates', icon: icon(Megaphone) },
      { label: 'Events', path: '/events', icon: icon(CalendarDays) },
      { label: 'Chat', path: '/chat', icon: icon(MessageCircle), desktopOnly: true },
    ],
  },
  {
    label: 'Support',
    labelColor: 'text-primary-400',
    dotColor: 'bg-primary-400',
    items: [
      { label: 'Shop', path: '/shop', icon: icon(ShoppingBag) },
      { label: 'Donate', path: '/donate', icon: icon(Heart) },
      { label: 'Leadership Opportunities', path: '/leadership', icon: icon(Users) },
      { label: 'Our Partners', path: '/partners', icon: icon(Handshake) },
      { label: 'Contact Us', path: '/contact', icon: icon(Mail) },
    ],
  },
]
