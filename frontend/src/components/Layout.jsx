import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import RealtimeNotifications from './RealtimeNotifications'

function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
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

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div>
          <h2 style={styles.logo}>TeamFlow</h2>
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
      <main style={styles.main}>
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
