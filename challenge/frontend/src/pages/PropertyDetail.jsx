import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApi, apiCall } from '../hooks/useApi';
import { StatusBadge, TypeBadge, ScoreBadge, PriorityBadge } from '../components/Badges';

function formatPrice(p) {
  if (!p) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TYPE_IMAGES = {
  apartment: ['/images/image2.jpg', '/images/image1.jpg'],
  house:     ['/images/image5.jpg', '/images/image4.jpg', '/images/image3.jpg'],
  office:    ['/images/image1.jpg', '/images/image2.jpg'],
  land:      ['/images/image3.jpg', '/images/image4.jpg'],
  commercial:['/images/image1.jpg', '/images/image2.jpg'],
};

function parseImages(raw, type) {
  try {
    const imgs = typeof raw === 'string' ? JSON.parse(raw || '[]') : (raw || []);
    if (imgs.length > 0) return imgs;
  } catch (_) {}
  return TYPE_IMAGES[type] || ['/images/image1.jpg'];
}

const ACTIVITY_ICONS  = { call: '📞', email: '✉️', visit: '🚪', note: '📝', reminder: '⏰' };
const ACTIVITY_LABELS = { call: 'Llamada', email: 'Email', visit: 'Visita', note: 'Nota', reminder: 'Recordatorio' };

function AddActivityModal({ propertyId, onClose, onSaved }) {
  const [form, setForm] = useState({ type: 'visit', title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiCall('POST', '/activities', { ...form, property_id: propertyId });
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
                <option value="visit">🚪 Visita</option>
                <option value="call">📞 Llamada</option>
                <option value="note">📝 Nota</option>
                <option value="reminder">⏰ Recordatorio</option>
              </select>
            </div>
            <div className="form-group">
              <label>Título *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Visita con comprador" required />
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

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: property, loading, refetch } = useApi(`/properties/${id}`);
  const { data: activities, refetch: refetchActivities } = useApi(`/activities?property_id=${id}`);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const handleActivitySaved = () => {
    refetchActivities();
    refetch();
  };

  if (loading) return (
    <>
      <div className="page-header"><div><h2>Propiedad</h2><p>Cargando...</p></div></div>
      <div className="page-body"><div className="loading"><div className="spinner" /> Cargando...</div></div>
    </>
  );

  if (!property) return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/properties" className="btn btn-secondary btn-sm">← Propiedades</Link>
          <div><h2>Propiedad no encontrada</h2></div>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔄</div>
            <h3 style={{ marginBottom: 8, fontWeight: 600 }}>Datos desactualizados</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7 }}>
              La base de datos se reinició desde que cargaste la lista.<br />
              Recarga la página de propiedades para obtener los IDs actualizados.
            </p>
            <Link to="/properties" className="btn btn-primary" style={{ justifyContent: 'center' }}>
              Volver a Propiedades
            </Link>
          </div>
        </div>
      </div>
    </>
  );

  const allImages = parseImages(property.images, property.type);

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${property.title}"? Se eliminarán también sus oportunidades.`)) return;
    try {
      await apiCall('DELETE', `/properties/${id}`);
      navigate('/properties');
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/properties" className="btn btn-secondary btn-sm">← Propiedades</Link>
          <div>
            <h2>{property.title}</h2>
            <p style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <TypeBadge type={property.type} />
              <StatusBadge status={property.status} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>{formatPrice(property.price)}</span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowActivityModal(true)}>+ Actividad</button>
          <Link to={`/matches?property=${id}`} className="btn btn-primary btn-sm">✨ Smart Matches</Link>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>Eliminar</button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Hero image + gallery + description */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ height: 280, overflow: 'hidden', position: 'relative', background: 'var(--beige)' }}>
                <img
                  src={allImages[activeImg]}
                  alt={property.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity .2s' }}
                />
                <div style={{
                  position: 'absolute', bottom: 16, left: 16,
                  background: 'rgba(10,10,10,.7)', backdropFilter: 'blur(6px)',
                  padding: '8px 16px', borderRadius: 4,
                  color: 'white', fontWeight: 700, fontSize: 20,
                }}>
                  {formatPrice(property.price)}
                </div>
                {allImages.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 6 }}>
                    {allImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        style={{
                          width: i === activeImg ? 24 : 8, height: 8,
                          borderRadius: 4, border: 'none', cursor: 'pointer',
                          background: i === activeImg ? 'white' : 'rgba(255,255,255,.5)',
                          transition: 'all .2s', padding: 0,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              {allImages.length > 1 && (
                <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', background: 'var(--gray-light)', borderBottom: '1px solid var(--border)' }}>
                  {allImages.map((src, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveImg(i)}
                      style={{
                        width: 60, height: 44, flexShrink: 0, borderRadius: 4, overflow: 'hidden',
                        cursor: 'pointer', border: i === activeImg ? '2px solid var(--gold)' : '2px solid transparent',
                        transition: 'border-color .15s',
                      }}
                    >
                      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}

              <div className="card-body">
                <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                  {property.bedrooms > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22 }}>🛏</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{property.bedrooms} hab.</div>
                    </div>
                  )}
                  {property.bathrooms > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22 }}>🚿</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{property.bathrooms} baños</div>
                    </div>
                  )}
                  {property.size_m2 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22 }}>📐</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{property.size_m2} m²</div>
                    </div>
                  )}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22 }}>📍</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {property.neighborhood ? `${property.neighborhood}, ` : ''}{property.location}
                    </div>
                  </div>
                </div>
                {property.description && (
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {property.description}
                  </p>
                )}
              </div>
            </div>

            {/* Interested buyers / opportunities */}
            <div className="card">
              <div className="card-header">
                <h3>Compradores interesados ({(property.opportunities || []).length})</h3>
                <Link to={`/matches?property=${id}`} className="btn btn-sm btn-primary">✨ Buscar más</Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {(property.opportunities || []).length === 0 ? (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <p>Sin compradores aún. Usa Smart Matches para encontrar candidatos.</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Etapa</th>
                        <th>Prioridad</th>
                        <th>Match</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {property.opportunities.map(o => (
                        <tr key={o.id}>
                          <td>
                            <div className="td-name">{o.client_name}</div>
                            <div className="td-sub">{o.client_email || o.client_phone || '—'}</div>
                          </td>
                          <td><StatusBadge status={o.status} /></td>
                          <td><PriorityBadge priority={o.priority} /></td>
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
                {!(activities || []).length ? (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <p>Sin actividades registradas para esta propiedad.</p>
                  </div>
                ) : (
                  <div style={{ padding: '8px 0' }}>
                    {activities.map((a, i) => (
                      <div key={a.id} style={{
                        display: 'flex', gap: 14, padding: '12px 24px',
                        borderBottom: i < activities.length - 1 ? '1px solid var(--border)' : 'none',
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

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Property meta */}
            <div className="card">
              <div className="card-header"><h3>Detalles</h3></div>
              <div className="card-body" style={{ padding: '8px 24px' }}>
                {[
                  ['Estado',    <StatusBadge key="s" status={property.status} />],
                  ['Tipo',      <TypeBadge   key="t" type={property.type} />],
                  ['Precio',    formatPrice(property.price)],
                  ['Superficie', property.size_m2 ? `${property.size_m2} m²` : '—'],
                  ['Habitaciones', property.bedrooms || '—'],
                  ['Baños',     property.bathrooms || '—'],
                  ['Localidad', property.location],
                  ['Barrio',    property.neighborhood || '—'],
                  ['Publicado', formatDate(property.created_at)],
                ].map(([label, value]) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Seller info */}
            {property.seller_name && (
              <div className="card">
                <div className="card-header"><h3>Propietario / Vendedor</h3></div>
                <div className="card-body" style={{ textAlign: 'center', paddingTop: 24 }}>
                  <div className="avatar" style={{ width: 48, height: 48, fontSize: 16, margin: '0 auto 12px' }}>
                    {property.seller_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{property.seller_name}</div>
                  {property.seller_phone && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>📞 {property.seller_phone}</div>}
                  {property.seller_email && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>✉️ {property.seller_email}</div>}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {showActivityModal && (
        <AddActivityModal
          propertyId={id}
          onClose={() => setShowActivityModal(false)}
          onSaved={handleActivitySaved}
        />
      )}
    </>
  );
}
