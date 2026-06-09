import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import RealtimeNotifications from './RealtimeNotifications'

function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/tasks', label: 'Tasks' },
    { path: '/projects', label: 'Projects' },
    { path: '/reports', label: 'KPI Reports' },
    { path: '/notifications', label: 'Notifications' },
    ...(user.role === 'qa' || user.role === 'lead'
      ? [{ path: '/qa', label: 'QA Queue' }]
      : []),
    ...(user.role === 'lead' ? [{ path: '/team', label: 'Team' }] : []),
    { path: '/settings', label: 'Settings' },
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="app-layout" style={styles.container}>
      <header className="mobile-header">
        <button
          className="mobile-menu-button"
          type="button"
          aria-label="Open navigation"
          onClick={() => setMenuOpen(true)}
        >
          Menu
        </button>
        <strong>TeamFlow</strong>
        <span>{user.role}</span>
      </header>
      {menuOpen && (
        <button
          className="mobile-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`app-sidebar ${menuOpen ? 'open' : ''}`} style={styles.sidebar}>
        <div>
          <div className="sidebar-title-row">
            <h2 style={styles.logo}>TeamFlow</h2>
            <button className="mobile-close-button" onClick={() => setMenuOpen(false)}>Close</button>
          </div>
          <nav>
            {navItems.map(item => (
              <button
                key={item.path}
                type="button"
                style={{
                  ...styles.navItem,
                  background: location.pathname === item.path
                    ? 'rgba(255,255,255,0.1)'
                    : 'transparent',
                  color: location.pathname === item.path ? '#fff' : '#a5b4fc',
                }}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div>
          <p style={styles.userInfo}>{user.name}</p>
          <p style={styles.userRole}>{user.role}</p>
          <button style={styles.logout} onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="app-main" style={styles.main}>
        <Outlet />
      </main>
      <RealtimeNotifications />
    </div>
  )
}

const styles = {
  container: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: '220px', background: '#1e1b4b',
    padding: '24px 16px', display: 'flex',
    flexDirection: 'column', justifyContent: 'space-between',
    position: 'fixed', top: 0, left: 0, bottom: 0,
  },
  logo: { color: '#fff', fontSize: '22px', fontWeight: '700', marginBottom: '32px' },
  navItem: {
    display: 'block', width: '100%', border: 'none', textAlign: 'left',
    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
    marginBottom: '4px', fontSize: '14px',
  },
  userInfo: { color: '#fff', fontSize: '13px', marginBottom: '2px' },
  userRole: {
    color: '#a5b4fc', fontSize: '11px', marginTop: 0,
    marginBottom: '10px', textTransform: 'uppercase',
  },
  logout: {
    background: '#4f46e5', color: '#fff',
    border: 'none', padding: '10px',
    borderRadius: '8px', cursor: 'pointer',
    width: '100%', fontSize: '14px',
  },
  main: { marginLeft: '220px', flex: 1, background: '#f0f2f5' },
}

export default Layout
