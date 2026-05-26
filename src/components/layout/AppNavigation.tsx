import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { APP_NAV_TABS } from './nav-tabs'
import './bottom-tab-bar.css'
import './app-shell.css'

function NavItems({ variant }: { variant: 'bottom' | 'side' }) {
  const { pathname } = useLocation()

  return (
    <>
      {APP_NAV_TABS.map((tab) => {
        const active = tab.match(pathname)
        const Icon = tab.icon

        if (variant === 'side') {
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={cn('app-side-tab', active && 'app-side-tab--active')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="app-side-tab-icon" strokeWidth={active ? 2.5 : 2} />
              <span className="app-side-tab-text">
                <span className="app-side-tab-label">{tab.label}</span>
                {tab.subtitle ? (
                  <span className="app-side-tab-sub">{tab.subtitle}</span>
                ) : null}
              </span>
            </NavLink>
          )
        }

        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={cn('app-bottom-tab', active && 'app-bottom-tab--active')}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="app-bottom-tab-icon" strokeWidth={active ? 2.5 : 2} />
            <span className="app-bottom-tab-label">{tab.label}</span>
            {tab.subtitle ? (
              <span className="app-bottom-tab-sub">{tab.subtitle}</span>
            ) : null}
          </NavLink>
        )
      })}
    </>
  )
}

export function AppSideNav() {
  return (
    <nav className="app-side-nav" aria-label="Main navigation">
      <NavItems variant="side" />
    </nav>
  )
}

export function AppBottomNav() {
  return (
    <nav className="app-bottom-nav lg:hidden" aria-label="Main navigation">
      <div className="app-bottom-nav-inner">
        <NavItems variant="bottom" />
      </div>
    </nav>
  )
}

/** @deprecated Use AppBottomNav */
export function BottomTabBar() {
  return <AppBottomNav />
}
