import { NavLink, useLocation } from 'react-router-dom'
import { Home, DollarSign, ArrowLeftRight, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import './bottom-tab-bar.css'

const TABS = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: Home,
    match: (path: string) => path === '/dashboard' || path === '/upload' || path.startsWith('/shifts'),
  },
  {
    to: '/pay',
    label: 'Pay',
    subtitle: 'Premiums & Overtime',
    icon: DollarSign,
    match: (path: string) => path === '/pay',
  },
  {
    to: '/swaps',
    label: 'Swaps',
    subtitle: 'Request & Manage',
    icon: ArrowLeftRight,
    match: (path: string) => path.startsWith('/swaps'),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: User,
    match: (path: string) =>
      path === '/profile' || path === '/subscription' || path === '/leave',
  },
] as const

export function BottomTabBar() {
  const { pathname } = useLocation()

  return (
    <nav className="app-bottom-nav" aria-label="Main navigation">
      <div className="app-bottom-nav-inner">
        {TABS.map((tab) => {
          const active = tab.match(pathname)
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={cn('app-bottom-tab', active && 'app-bottom-tab--active')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="app-bottom-tab-icon" strokeWidth={active ? 2.5 : 2} />
              <span className="app-bottom-tab-label">{tab.label}</span>
              {'subtitle' in tab && tab.subtitle ? (
                <span className="app-bottom-tab-sub">{tab.subtitle}</span>
              ) : null}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
