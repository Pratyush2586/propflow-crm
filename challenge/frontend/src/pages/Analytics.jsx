import { useApi } from '../hooks/useApi';

function formatPrice(p) {
  if (!p) return '€0';
  if (p >= 1_000_000) return `€${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1000)      return `€${Math.round(p / 1000)}k`;
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p);
}

const STAGE_LABELS = {
  interested:  '👀 Interesado',
  visiting:    '🚪 Visita',
  negotiating: '🤝 Negociando',
  closed_won:  '🎉 Ganado',
  closed_lost: '❌ Perdido',
};

const STAGE_COLORS = {
  interested:  'var(--primary, #3b82f6)',
  visiting:    '#8b5cf6',
  negotiating: 'var(--warning)',
  closed_won:  'var(--success)',
  closed_lost: 'var(--danger)',
};

const ACTIVITY_ICONS = { call: '📞', email: '✉️', visit: '🚪', note: '📝', reminder: '⏰' };

const TYPE_LABELS = { apartment: 'Apartamento', house: 'Casa', office: 'Oficina', land: 'Terreno', commercial: 'Local' };

export default function Analytics() {
  const { data, loading } = useApi('/dashboard/analytics');

  if (loading) return (
    <>
      <div className="page-header"><div><h2>Analytics</h2><p>Cargando datos...</p></div></div>
      <div className="page-body"><div className="loading"><div className="spinner" /> Cargando...</div></div>
    </>
  );

  if (!data) return null;

  const { monthly, pipelineStages, conversion, totalRevenue, topProperties, activityBreakdown, avgDaysToClose } = data;

  // Max values for bar scaling
  const maxMonthlyRevenue = Math.max(...(monthly.map(m => m.revenue || 0)), 1);
  const maxStageCount = Math.max(...(pipelineStages.map(s => s.count)), 1);
  const maxActivityCount = Math.max(...(activityBreakdown.map(a => a.count)), 1);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Analytics</h2>
          <p>Rendimiento del negocio inmobiliario</p>
        </div>
      </div>

      <div className="page-body">

        {/* KPI row */}
        <div className="stats-grid" style={{ marginBottom: 32 }}>
          <div className="stat-card">
            <div className="stat-icon green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{formatPrice(totalRevenue)}</div>
              <div className="stat-label">Revenue total</div>
              <div className="stat-sub">{conversion.won} cierres ganados</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-dark)" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{conversion.rate}%</div>
              <div className="stat-label">Tasa de conversión</div>
              <div className="stat-sub">{conversion.won} ganados de {conversion.total} totales</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{avgDaysToClose || '—'}</div>
              <div className="stat-label">Días medio al cierre</div>
              <div className="stat-sub">Desde creación hasta cierre</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-dark)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{conversion.active}</div>
              <div className="stat-label">Oportunidades activas</div>
              <div className="stat-sub">{conversion.lost} perdidas · {conversion.won} ganadas</div>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 24 }}>

          {/* Monthly revenue chart */}
          <div className="card">
            <div className="card-header"><h3>Ingresos mensuales (últimos 6 meses)</h3></div>
            <div className="card-body">
              {monthly.length === 0 ? (
                <div className="empty-state"><p>Sin cierres ganados aún para mostrar.</p></div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, padding: '0 8px' }}>
                  {monthly.map(m => {
                    const barH = Math.max((m.revenue / maxMonthlyRevenue) * 140, 4);
                    const monthLabel = m.month ? m.month.slice(5) : '';
                    return (
                      <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                          {formatPrice(m.revenue)}
                        </div>
                        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                          <div style={{
                            width: '80%', height: barH,
                            background: 'linear-gradient(to top, var(--success), var(--success-light))',
                            borderRadius: '3px 3px 0 0',
                            border: '1px solid rgba(74,124,89,.2)',
                          }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{monthLabel}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.deals} {m.deals === 1 ? 'cierre' : 'cierres'}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pipeline funnel */}
          <div className="card">
            <div className="card-header"><h3>Embudo de pipeline</h3></div>
            <div className="card-body">
              {pipelineStages.length === 0 ? (
                <div className="empty-state"><p>Sin oportunidades registradas.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pipelineStages.map(s => (
                    <div key={s.status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12.5 }}>
                        <span style={{ fontWeight: 500 }}>{STAGE_LABELS[s.status] || s.status}</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {s.count} · {formatPrice(s.total_value)}
                        </span>
                      </div>
                      <div style={{ height: 8, background: 'var(--beige)', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${(s.count / maxStageCount) * 100}%`,
                          background: STAGE_COLORS[s.status] || 'var(--gold)',
                          borderRadius: 100,
                          transition: 'width .4s ease',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="grid-2">

          {/* Top properties */}
          <div className="card">
            <div className="card-header"><h3>Propiedades más activas</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              {topProperties.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}><p>Sin datos aún.</p></div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Propiedad</th>
                      <th>Precio</th>
                      <th>Interesados</th>
                      <th>Match medio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProperties.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="td-name">{p.title}</div>
                          <div className="td-sub">{TYPE_LABELS[p.type] || p.type} · {p.location}</div>
                        </td>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{formatPrice(p.price)}</td>
                        <td>
                          <span className="badge badge-blue">{p.opp_count}</span>
                        </td>
                        <td>
                          <span className={`badge ${p.avg_score >= 70 ? 'badge-green' : p.avg_score >= 40 ? 'badge-yellow' : 'badge-gray'}`}>
                            {Math.round(p.avg_score)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Activity breakdown */}
          <div className="card">
            <div className="card-header"><h3>Actividades registradas</h3></div>
            <div className="card-body">
              {activityBreakdown.length === 0 ? (
                <div className="empty-state"><p>Sin actividades registradas aún.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {activityBreakdown.map(a => (
                    <div key={a.type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                        <span style={{ fontWeight: 500 }}>
                          {ACTIVITY_ICONS[a.type] || '📌'} {a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{a.count}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--beige)', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${(a.count / maxActivityCount) * 100}%`,
                          background: 'var(--gold)',
                          borderRadius: 100,
                        }} />
                      </div>
                    </div>
                  ))}

                  <div style={{
                    marginTop: 8, padding: '14px 0 0',
                    borderTop: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 13,
                  }}>
                    <span style={{ fontWeight: 600 }}>Total</span>
                    <span style={{ fontWeight: 700, color: 'var(--black)' }}>
                      {activityBreakdown.reduce((s, a) => s + a.count, 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
