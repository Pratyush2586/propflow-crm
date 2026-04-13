import { useState, useRef } from 'react';
import { useApi, apiCall } from '../hooks/useApi';
import { StatusBadge, TypeBadge } from '../components/Badges';
import { Link } from 'react-router-dom';

function formatPrice(p) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p);
}

// Fallback stock images by type
const TYPE_IMAGES = {
  apartment: ['/images/image2.jpg', '/images/image1.jpg'],
  house:     ['/images/image5.jpg', '/images/image4.jpg', '/images/image3.jpg'],
  office:    ['/images/image1.jpg', '/images/image2.jpg'],
  land:      ['/images/image3.jpg', '/images/image4.jpg'],
  commercial:['/images/image1.jpg', '/images/image2.jpg'],
};

function getPropertyImage(property, index) {
  try {
    const imgs = typeof property.images === 'string' ? JSON.parse(property.images) : (property.images || []);
    if (imgs.length > 0) return imgs[0];
  } catch (_) {}
  const fallbacks = TYPE_IMAGES[property.type] || ['/images/image1.jpg'];
  return fallbacks[index % fallbacks.length];
}

// Compress a File to base64 JPEG — max 900px wide, quality 0.72
// Target: ~80-180 KB per image as base64 → 5 photos ≈ 1 MB payload
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX_W = 900;
        const ratio = img.width > MAX_W ? MAX_W / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Image uploader used inside PropertyForm ──────────────────────────────────
function ImageUploader({ images, onChange }) {
  const inputRef = useRef();
  const [compressing, setCompressing] = useState(false);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setCompressing(true);
    try {
      const results = await Promise.all(
        Array.from(files).slice(0, 5 - images.length).map(compressImage)
      );
      onChange([...images, ...results]);
    } catch (e) {
      alert('Error al procesar imagen: ' + e.message);
    } finally {
      setCompressing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (i) => onChange(images.filter((_, idx) => idx !== i));

  const onDrop = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '';
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      {/* Thumbnail strip */}
      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {images.map((src, i) => (
            <div key={i} style={{ position: 'relative', width: 88, height: 66, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {i === 0 && (
                <div style={{
                  position: 'absolute', top: 3, left: 3,
                  background: 'rgba(10,10,10,.65)', color: '#fff',
                  fontSize: 9, fontWeight: 600, letterSpacing: '.06em',
                  padding: '2px 5px', borderRadius: 2, textTransform: 'uppercase',
                }}>
                  Principal
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                style={{
                  position: 'absolute', top: 3, right: 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'rgba(139,58,58,.85)', border: 'none',
                  color: '#fff', fontSize: 11, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {images.length < 5 && (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--gold)'; }}
          onDragLeave={e => { e.currentTarget.style.borderColor = ''; }}
          style={{
            border: '2px dashed var(--border-dark)',
            borderRadius: 6,
            padding: '20px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color .2s',
            background: 'var(--gray-light)',
          }}
        >
          {compressing ? (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Comprimiendo...</span>
          ) : (
            <>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📷</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Arrastra fotos aquí o haz clic para seleccionar
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                JPG, PNG, WEBP · máx. {5 - images.length} foto{5 - images.length !== 1 ? 's' : ''} más · se comprimen automáticamente
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}

// ── Property form ────────────────────────────────────────────────────────────
function PropertyForm({ initial = {}, sellers = [], onSave, onCancel, loading }) {
  const parseImages = (raw) => {
    try { return Array.isArray(raw) ? raw : JSON.parse(raw || '[]'); }
    catch (_) { return []; }
  };

  const [form, setForm] = useState({
    title: '', type: 'apartment', price: '', location: '', neighborhood: '',
    bedrooms: '', bathrooms: '', size_m2: '', description: '', seller_id: '', status: 'available',
    ...initial,
    budget_min: initial.budget_min || '',
    budget_max: initial.budget_max || '',
    preferred_bedrooms: initial.preferred_bedrooms || '',
  });
  const [images, setImages] = useState(parseImages(initial.images));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = e => {
    e.preventDefault();
    onSave({ ...form, images });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <div className="form-row cols-2" style={{ marginBottom: 16 }}>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Título *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Piso luminoso en el centro" required />
          </div>
          <div className="form-group">
            <label>Tipo *</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="apartment">Apartamento</option>
              <option value="house">Casa / Chalet</option>
              <option value="office">Oficina</option>
              <option value="land">Terreno</option>
              <option value="commercial">Local Comercial</option>
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="available">Disponible</option>
              <option value="reserved">Reservado</option>
              <option value="sold">Vendido</option>
            </select>
          </div>
          <div className="form-group">
            <label>Precio (€) *</label>
            <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="250000" required min="0" />
          </div>
          <div className="form-group">
            <label>Superficie (m²)</label>
            <input type="number" value={form.size_m2} onChange={e => set('size_m2', e.target.value)} placeholder="90" min="0" />
          </div>
          <div className="form-group">
            <label>Localidad *</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Madrid" required />
          </div>
          <div className="form-group">
            <label>Barrio / Zona</label>
            <input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="Salamanca" />
          </div>
          <div className="form-group">
            <label>Habitaciones</label>
            <input type="number" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} min="0" placeholder="2" />
          </div>
          <div className="form-group">
            <label>Baños</label>
            <input type="number" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} min="0" placeholder="1" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Propietario / Vendedor</label>
            <select value={form.seller_id} onChange={e => set('seller_id', e.target.value)}>
              <option value="">Sin asignar</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Descripción</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe el inmueble..." rows={3} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Fotos ({images.length}/5)</label>
            <ImageUploader images={images} onChange={setImages} />
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : initial.id ? 'Actualizar' : 'Crear Propiedad'}
        </button>
      </div>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Properties() {
  const { data: properties, loading, refetch } = useApi('/properties');
  const { data: clients } = useApi('/clients?type=seller');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sellers = (clients || []).filter(c => c.type === 'seller' || c.type === 'both');

  const filtered = (properties || []).filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterType && p.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q) || (p.neighborhood || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleSave = async (form) => {
    setSaving(true);
    setError('');
    try {
      if (modal?.id) {
        await apiCall('PUT', `/properties/${modal.id}`, form);
      } else {
        await apiCall('POST', '/properties', form);
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
    if (!confirm('¿Eliminar esta propiedad?')) return;
    try {
      await apiCall('DELETE', `/properties/${id}`);
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Propiedades</h2>
          <p>{(properties || []).length} inmuebles registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ Nueva Propiedad</button>
      </div>

      <div className="page-body">
        <div className="filters-bar">
          <input
            className="search-input"
            placeholder="Buscar por título, zona..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="available">Disponible</option>
            <option value="reserved">Reservado</option>
            <option value="sold">Vendido</option>
          </select>
          <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="apartment">Apartamento</option>
            <option value="house">Casa</option>
            <option value="office">Oficina</option>
            <option value="land">Terreno</option>
            <option value="commercial">Local</option>
          </select>
          <span className="text-muted text-sm">{filtered.length} resultados</span>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" />Cargando propiedades...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🏡</div>
            <h3>No hay propiedades</h3>
            <p>Añade tu primera propiedad para empezar.</p>
          </div>
        ) : (
          <div className="properties-grid">
            {filtered.map((p, i) => (
              <div className="property-card" key={p.id}>
                <div className="property-card-img" style={{ padding: 0, overflow: 'hidden' }}>
                  <img
                    src={getPropertyImage(p, i)}
                    alt={p.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div className="price-tag">{formatPrice(p.price)}</div>
                  <div className="status-tag"><StatusBadge status={p.status} /></div>
                </div>
                <div className="property-card-body">
                  <h3>{p.title}</h3>
                  <div className="property-location">📍 {p.neighborhood ? `${p.neighborhood}, ` : ''}{p.location}</div>
                  <div className="property-specs">
                    {p.bedrooms > 0 && <span className="spec-item">🛏 {p.bedrooms}</span>}
                    {p.bathrooms > 0 && <span className="spec-item">🚿 {p.bathrooms}</span>}
                    {p.size_m2 && <span className="spec-item">📐 {p.size_m2}m²</span>}
                    <TypeBadge type={p.type} />
                  </div>
                  {p.seller_name && (
                    <div className="text-sm text-muted" style={{ marginBottom: 8 }}>
                      👤 {p.seller_name}
                    </div>
                  )}
                  <div className="property-card-actions">
                    <Link to={`/properties/${p.id}`} className="btn btn-sm btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                      Ver detalle
                    </Link>
                    <Link to={`/matches?property=${p.id}`} className="btn btn-sm btn-primary">✨</Link>
                    <button className="btn btn-sm btn-secondary" onClick={() => setModal(p)}>✏️</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>{modal === 'new' ? 'Nueva Propiedad' : `Editar: ${modal.title}`}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ margin: '0 24px', marginTop: 16 }}>⚠ {error}</div>}
            <PropertyForm
              initial={modal === 'new' ? {} : modal}
              sellers={sellers}
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
