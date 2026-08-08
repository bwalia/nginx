import { NavLink, Outlet } from 'react-router-dom'
import { bank } from '../data/banking'

const links = [
  { to: '/', label: 'Overview', end: true },
  { to: '/walkthrough', label: 'Walkthrough' },
  { to: '/lab', label: 'Attack Lab' },
  { to: '/policies', label: 'Policies' },
  { to: '/architecture', label: 'Architecture' },
]

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topnav">
        <NavLink to="/" className="brand">
          <div className="brand-mark">F5</div>
          <div className="brand-text">
            <strong>App Protect</strong>
            <span>{bank.name}</span>
          </div>
        </NavLink>
        <nav className="nav-links" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
