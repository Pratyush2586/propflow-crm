import { useState } from 'react';
import { useApi, apiCall } from '../hooks/useApi';
import { StatusBadge, TypeBadge, PriorityBadge } from '../components/Badges';
import { Link } from 'react-router-dom';

function formatPrice(p) {
  if (!p) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p);
}

function ClientForm({ initial = {}, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', type: 'buyer', status: 'active',
    budget_min: '', budget_max: '', preferred_location: '', preferred_type: '',
    preferred_bedrooms: '', notes: '', priority: 'medium',
    ...initial,
    budget_min: initial.budget_min || '',
    budget_max: initial.budget_max || '',
    preferred_bedrooms: initial.preferred_bedrooms || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isBuyer = form.type === 'buyer' || form.type === 'both';

  const handleSubmit = e => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <div className="form-row cols-2">
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Nombre completo *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="María García" required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="maria@email.com" />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+34 600 000 000" />
          </div>
          <div className="form-group">
            <label>Tipo *</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="buyer">Comprador</option>
              <option value="seller">Vendedor</option>
              <option value="both">Ambos</option>
            </select>
          </div>
          <div className="form-group">
            <label>Prioridad</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>

          {isBuyer && (
            <>
              <div className="form-group">
                <label>Presupuesto mínimo (€)</label>
                <input type="number" value={form.budget_min} onChange={e => set('budget_min', e.target.value)} placeholder="150000" min="0" />
              </div>
              <div className="form-group">
                <label>Presupuesto máximo (€)</label>
                <input type="number" value={form.budget_max} onChange={e => set('budget_max', e.target.value)} placeholder="300000" min="0" />
              </div>
              <div className="form-group">
                <label>Zona preferida</label>
                <input value={form.preferred_location} onChange={e => set('preferred_location', e.target.value)} placeholder="Madrid Centro" />
              </div>
              <div className="form-group">
                <label>Tipo inmueble preferido</label>
                <select value={form.preferred_type} onChange={e => set('preferred_type', e.target.value)}>
                  <option value="">Sin preferencia</option>
                  <option value="apartment">Apartamento</option>
                  <option value="house">Casa / Chalet</option>
                  <option value="office">Oficina</option>
                  <option value="land">Terreno</option>
                  <option value="commercial">Local</option>
                </select>
              </div>
              <div className="form-group">
                <label>Habitaciones preferidas</label>
                <input type="number" value={form.preferred_bedrooms} onChange={e => set('preferred_bedrooms', e.target.value)} placeholder="2" min="0" />
              </div>
            </>
          )}

          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observaciones sobre el cliente..." rows={2} />
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : initial.id ? 'Actualizar' : 'Crear Cliente'}
        </button>
      </div>
    </form>
  );
}

export default function Clients() {
  const { data: clients, loading, refetch } = useApi('/clients');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterPriority, setFilterPriority] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const tabFilter = {
    all: c => true,
    buyers: c => c.type === 'buyer' || c.type === 'both',
    sellers: c => c.type === 'seller' || c.type === 'both',
  };

  const filtered = (clients || []).filter(c => {
    if (!tabFilter[activeTab](c)) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterPriority && c.priority !== filterPriority) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
    }
    return true;
  });

  const handleSave = async (form) => {
    setSaving(true);
    setError('');
    try {
      if (modal?.id) {
        await apiCall('PUT', `/clients/${modal.id}`, form);
      } else {
        await apiCall('POST', '/clients', form);
      }
      setModal(null);
      refetch();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await apiCall('DELETE', `/clients/${id}`);
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  const buyers = (clients || []).filter(c => c.type === 'buyer' || c.type === 'both');
  const sellers = (clients || []).filter(c => c.type === 'seller' || c.type === 'both');

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Clientes</h2>
          <p>{buyers.length} compradores · {sellers.length} vendedores</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ Nuevo Cliente</button>
      </div>

      <div className="page-body">
        <div className="tabs">
          {[['all','Todos'], ['buyers','Compradores'], ['sellers','Vendedores']].map(([key, label]) => (
            <div key={key} className={`tab${activeTab === key ? ' active' : ''}`} onClick={() => setActiveTab(key)}>
              {label}
            </div>
          ))}
        </div>

        <div className="filters-bar">
          <input
            className="search-input"
            placeholder="Buscar por nombre, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="closed">Cerrados</option>
          </select>
          <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">Toda prioridad</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <span className="text-muted text-sm">{filtered.length} clientes</span>
        </div>

        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <div className="loading"><div className="spinner"/>Cargando clientes...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon">👥</div>
                <h3>No hay clientes</h3>
                <p>Añade tu primer cliente para empezar.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Presupuesto / Zona</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Opor.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex flex-center gap-8">
                          <div className="avatar">{c.name.slice(0, 2).toUpperCase()}</div>
                          <div>
                            <div className="td-name">{c.name}</div>
                            <div className="td-sub">{c.email || c.phone || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td><TypeBadge type={c.type} /></td>
                      <td>
                        {(c.type === 'buyer' || c.type === 'both') ? (
                          <div>
                            {c.budget_max ? (
                              <div className="td-name" style={{ fontSize: 13 }}>
                                {c.budget_min ? `${formatPrice(c.budget_min)} – ` : 'hasta '}{formatPrice(c.budget_max)}
                              </div>
                            ) : <span className="text-muted">Sin definir</span>}
                            {c.preferred_location && <div className="td-sub">📍 {c.preferred_location}</div>}
                          </div>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td><PriorityBadge priority={c.priority} /></td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>
                        <span className="badge badge-blue">{c.opportunity_count}</span>
                      </td>
                      <td>
                        <div className="flex gap-8">
                          {(c.type === 'buyer' || c.type === 'both') && (
                            <Link to={`/matches?client=${c.id}`} className="btn btn-xs btn-primary">✨ Matches</Link>
                          )}
                          <button className="btn btn-xs btn-secondary" onClick={() => setModal(c)}>✏️</button>
                          <button className="btn btn-xs btn-danger" onClick={() => handleDelete(c.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>{modal === 'new' ? 'Nuevo Cliente' : `Editar: ${modal.name}`}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ margin: '0 24px', marginTop: 16 }}>⚠ {error}</div>}
            <ClientForm
              initial={modal === 'new' ? {} : modal}
              onSave={handleSave}
              onCancel={() => setModal(null)}
              loading={saving}
            />
          </div>
        </div>
      )}
    </>
  );
}
