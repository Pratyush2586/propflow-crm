import { useApi } from '../hooks/useApi';
import { StatusBadge, PriorityBadge, ScoreBadge } from '../components/Badges';
import { Link } from 'react-router-dom';

function formatPrice(p) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p);
}

const PIPELINE_LABELS = {
  interested: 'Interesado',
  visiting: 'Visita',
  negotiating: 'Negociando',
  closed_won: 'Ganado',
  closed_lost: 'Perdido',
};

export default function Dashboard() {
  const { data, loading } = useApi('/dashboard/stats');

  if (loading) return (
    <><div className="page-header"><div><h2>Dashboard</h2><p>Vista general de tu negocio</p></div></div>
    <div className="page-body"><div className="loading"><div className="spinner"/> Cargando...</div></div></>
  );

  const s = data;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Vista general de tu actividad inmobiliaria</p>
        </div>
        <div className="flex gap-8">
          <Link to="/properties" className="btn btn-primary">+ Nueva Propiedad</Link>
          <Link to="/clients" className="btn btn-secondary">+ Nuevo Cliente</Link>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-dark)" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{s.properties.total}</div>
              <div className="stat-label">Propiedades</div>
              <div className="stat-sub">{s.properties.available} disponibles · {s.properties.reserved} reservadas</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{s.clients.total}</div>
              <div className="stat-label">Clientes</div>
              <div className="stat-sub">{s.clients.activeBuyers} compradores · {s.clients.activeSellers} vendedores</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{s.opportunities.active}</div>
              <div className="stat-label">Oportunidades</div>
              <div className="stat-sub">{s.opportunities.negotiating} en negociación</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-dark)" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{s.opportunities.avgMatchScore}%</div>
              <div className="stat-label">Match Score Medio</div>
              <div className="stat-sub">{s.opportunities.closedWon} cierres ganados</div>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Pipeline summary */}
          <div className="card">
            <div className="card-header">
              <h3>Pipeline por etapas</h3>
              <Link to="/pipeline" className="btn btn-sm btn-secondary">Ver todo</Link>
            </div>
            <div className="card-body">
              {s.pipeline.length === 0 ? (
                <div className="text-center text-muted" style={{ padding: '20px 0' }}>Sin oportunidades aún</div>
              ) : (
                s.pipeline.map(p => (
                  <div key={p.status} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 100, fontSize: 12.5, color: 'var(--gray-600)', fontWeight: 500 }}>
                      {PIPELINE_LABELS[p.status] || p.status}
                    </div>
                    <div style={{ flex: 1, height: 8, background: 'var(--gray-100)', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min((p.count / (s.opportunities.total || 1)) * 100, 100)}%`,
                        background: p.status === 'closed_won' ? 'var(--success)' : p.status === 'closed_lost' ? 'var(--danger)' : 'var(--primary)',
                        borderRadius: 100
                      }}/>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', width: 20, textAlign: 'right' }}>{p.count}</div>
                    {p.total_value && (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)', width: 90, textAlign: 'right' }}>
                        {formatPrice(p.total_value)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cold leads */}
          <div className="card">
            <div className="card-header">
              <h3>⚠️ Leads a retomar</h3>
              <span className="badge badge-yellow">+7 días sin contacto</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {s.coldLeads.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px' }}>
                  <p>¡Todo al día! No hay leads fríos.</p>
                </div>
              ) : (
                s.coldLeads.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--gray-100)' }}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                        {c.preferred_location || 'Sin preferencia de zona'}
                        {c.budget_max ? ` · hasta ${formatPrice(c.budget_max)}` : ''}
                      </div>
                    </div>
                    <PriorityBadge priority={c.priority} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid-2">
          {/* Top opportunities */}
          <div className="card">
            <div className="card-header">
              <h3>🔥 Mejores oportunidades</h3>
              <Link to="/pipeline" className="btn btn-sm btn-secondary">Ver pipeline</Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {s.topOpportunities.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px' }}>
                  <p>Crea oportunidades desde Smart Matches.</p>
                </div>
              ) : (
                s.topOpportunities.map(o => (
                  <div key={o.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 8,
                      background: o.match_score >= 70 ? 'var(--success-light)' : 'var(--warning-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      color: o.match_score >= 70 ? 'var(--success)' : 'var(--warning)',
                      flexShrink: 0
                    }}>
                      {o.match_score}%
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{o.property_title}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{o.client_name} · {formatPrice(o.price)}</div>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent properties */}
          <div className="card">
            <div className="card-header">
              <h3>🆕 Propiedades recientes</h3>
              <Link to="/properties" className="btn btn-sm btn-secondary">Ver todas</Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {s.recentProperties.map(p => (
                <div key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ fontSize: 24 }}>
                    {p.type === 'apartment' ? '🏢' : p.type === 'house' ? '🏠' : p.type === 'commercial' ? '🏪' : '🌿'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{p.location} · {formatPrice(p.price)}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
