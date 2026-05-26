import { Home, DollarSign, ArrowLeftRight, User, type LucideIcon } from 'lucide-react'

export type NavTab = {
  to: string
  label: string
  subtitle?: string
  icon: LucideIcon
  match: (path: string) => boolean
}

export const APP_NAV_TABS: NavTab[] = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: Home,
    match: (path) =>
      path === '/dashboard' || path === '/upload' || path.startsWith('/shifts'),
  },
  {
    to: '/pay',
    label: 'Pay',
    subtitle: 'Premiums & Overtime',
    icon: DollarSign,
    match: (path) => path === '/pay',
  },
  {
    to: '/swaps',
    label: 'Swaps',
    subtitle: 'Request & Manage',
    icon: ArrowLeftRight,
    match: (path) => path.startsWith('/swaps'),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: User,
    match: (path) =>
      path === '/profile' || path === '/subscription' || path === '/leave',
  },
]
