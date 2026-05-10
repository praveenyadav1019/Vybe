import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/users', label: 'Users', icon: '👥' },
  { to: '/parties', label: 'Parties', icon: '🎉' },
  { to: '/reports', label: 'Reports', icon: '🚩' },
];

export default function Layout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('admin_token');
    navigate('/login');
  }

  const token = localStorage.getItem('admin_token') ?? '';
  const displayToken = token.length > 20 ? token.slice(0, 18) + '…' : token;

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          VYBE <span>Admin</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <strong>Logged in</strong>
            <span style={{ wordBreak: 'break-all' }}>{displayToken}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </>
  );
}
