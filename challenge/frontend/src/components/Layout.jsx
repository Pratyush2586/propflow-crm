import { NavLink } from 'react-router-dom';

const navItems = [
  { section: 'Overview', links: [
    { to: '/',         icon: '▦',  label: 'Dashboard' },
  ]},
  { section: 'Portfolio', links: [
    { to: '/properties', icon: '⊞',  label: 'Propiedades' },
    { to: '/clients',    icon: '◎',  label: 'Clientes' },
  ]},
  { section: 'Negocio', links: [
    { to: '/pipeline', icon: '⟶',  label: 'Pipeline' },
    { to: '/matches',  icon: '◈',  label: 'Smart Matches' },
  ]},
];

export default function Layout({ children }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--gold)', flexShrink: 0 }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            PropFlow
          </h1>
          <p>Real Estate CRM</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(section => (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {section.links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="icon" style={{ fontStyle: 'normal', fontSize: 14 }}>{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid rgba(255,255,255,.06)',
          marginTop: 'auto'
        }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.2)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            PropFlow · v1.0
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
