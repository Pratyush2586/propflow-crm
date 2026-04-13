import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApi, apiCall } from '../hooks/useApi';
import { StatusBadge, TypeBadge, PriorityBadge, ScoreBadge } from '../components/Badges';

function formatPrice(p) {
  if (!p) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ACTIVITY_ICONS  = { call: '📞', email: '✉️', visit: '🚪', note: '📝', reminder: '⏰' };
const ACTIVITY_LABELS = { call: 'Llamada', email: 'Email', visit: 'Visita', note: 'Nota', reminder: 'Recordatorio' };

function AddActivityModal({ clientId, onClose, onSaved }) {
  const [form, setForm] = useState({ type: 'call', title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiCall('POST', '/activities', { ...form, client_id: clientId });
      onSaved();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Registrar Actividad</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Tipo</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="call">📞 Llamada</option>
                <option value="email">✉️ Email</option>
                <option value="visit">🚪 Visita</option>
                <option value="note">📝 Nota</option>
                <option value="reminder">⏰ Recordatorio</option>
              </select>
            </div>
            <div className="form-group">
              <label>Título *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Llamada de seguimiento" required />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detalles adicionales..." rows={3} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, loading, refetch } = useApi(`/clients/${id}`);
  const [showActivityModal, setShowActivityModal] = useState(false);

  if (loading) return (
    <>
      <div className="page-header"><div><h2>Cliente</h2><p>Cargando...</p></div></div>
      <div className="page-body"><div className="loading"><div className="spinner" /> Cargando...</div></div>
    </>
  );

  if (!client) return null;

  const isBuyer = client.type === 'buyer' || client.type === 'both';

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar a ${client.name}? Se eliminarán también sus oportunidades.`)) return;
    try {
      await apiCall('DELETE', `/clients/${id}`);
      navigate('/clients');
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/clients" className="btn btn-secondary btn-sm">← Clientes</Link>
          <div>
            <h2>{client.name}</h2>
            <p style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <TypeBadge type={client.type} />
              <PriorityBadge priority={client.priority} />
              <StatusBadge status={client.status} />
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowActivityModal(true)}>+ Actividad</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>Eliminar</button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Profile card */}
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', paddingTop: 32 }}>
                <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, margin: '0 auto 16px' }}>
                  {client.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{client.name}</div>
                {client.email && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>✉️ {client.email}</div>
                )}
                {client.phone && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>📞 {client.phone}</div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                  Último contacto: {formatDate(client.last_contact)}
                </div>
                {client.notes && (
                  <div style={{
                    marginTop: 16, padding: 12, background: 'var(--beige)',
                    borderRadius: 6, textAlign: 'left', fontSize: 12.5,
                    color: 'var(--text-secondary)', fontStyle: 'italic',
                  }}>
                    "{client.notes}"
                  </div>
                )}
              </div>
            </div>

            {/* Buyer preferences */}
            {isBuyer && (
              <div className="card">
                <div className="card-header"><h3>Preferencias de compra</h3></div>
                <div className="card-body" style={{ padding: '8px 24px' }}>
                  {[
                    ['Presupuesto', client.budget_min && client.budget_max
                      ? `${formatPrice(client.budget_min)} – ${formatPrice(client.budget_max)}`
                      : client.budget_max ? `hasta ${formatPrice(client.budget_max)}` : '—'],
                    ['Zona',        client.preferred_location || '—'],
                    ['Tipo',        client.preferred_type     || '—'],
                    ['Habitaciones', client.preferred_bedrooms ?? '—'],
                  ].map(([label, value]) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13,
                    }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                      <span style={{ fontWeight: 500 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="card">
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {isBuyer && (
                  <Link to={`/matches?client=${id}`} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                    ✨ Ver Smart Matches
                  </Link>
                )}
                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'center' }}
                  onClick={() => setShowActivityModal(true)}
                >
                  + Registrar actividad
                </button>
                <Link to="/pipeline" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                  ⟶ Ver pipeline
                </Link>
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Opportunities */}
            <div className="card">
              <div className="card-header">
                <h3>Oportunidades ({(client.opportunities || []).length})</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {(client.opportunities || []).length === 0 ? (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <p>Sin oportunidades. Usa Smart Matches para crear una.</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Propiedad</th>
                        <th>Precio</th>
                        <th>Etapa</th>
                        <th>Match</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {client.opportunities.map(o => (
                        <tr key={o.id}>
                          <td>
                            <div className="td-name">{o.property_title}</div>
                            <div className="td-sub">📍 {o.property_location}</div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatPrice(o.property_price)}</td>
                          <td><StatusBadge status={o.status} /></td>
                          <td><ScoreBadge score={o.match_score} /></td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(o.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Activity timeline */}
            <div className="card">
              <div className="card-header">
                <h3>Historial de actividad</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => setShowActivityModal(true)}>+ Nueva</button>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {(client.activities || []).length === 0 ? (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <p>Sin actividades. Registra una llamada, visita o nota.</p>
                  </div>
                ) : (
                  <div style={{ padding: '8px 0' }}>
                    {client.activities.map((a, i) => (
                      <div key={a.id} style={{
                        display: 'flex', gap: 14, padding: '12px 24px',
                        borderBottom: i < client.activities.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'var(--beige)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, flexShrink: 0,
                        }}>
                          {ACTIVITY_ICONS[a.type] || '📌'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span style={{ fontSize: 13.5, fontWeight: 500 }}>{a.title}</span>
                              <span style={{
                                marginLeft: 8, fontSize: 11, color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '.06em',
                              }}>
                                {ACTIVITY_LABELS[a.type]}
                              </span>
                            </div>
                            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 12 }}>
                              {formatDate(a.created_at)}
                            </span>
                          </div>
                          {a.description && (
                            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                              {a.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {showActivityModal && (
        <AddActivityModal
          clientId={id}
          onClose={() => setShowActivityModal(false)}
          onSaved={refetch}
        />
      )}
    </>
  );
}
