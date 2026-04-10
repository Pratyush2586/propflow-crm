import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, apiCall } from '../hooks/useApi';
import { TypeBadge, PriorityBadge } from '../components/Badges';

function formatPrice(p) {
  if (!p) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p);
}

function ScoreCircle({ score }) {
  const cls = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  return (
    <div className={`match-score-circle ${cls}`}>
      <span>{score}</span>
      <span style={{ fontSize: 9, fontWeight: 500 }}>%</span>
    </div>
  );
}

export default function SmartMatches() {
  const [searchParams] = useSearchParams();
  const propertyParam = searchParams.get('property');
  const clientParam = searchParams.get('client');

  const { data: properties } = useApi('/properties?status=available');
  const { data: clients } = useApi('/clients?status=active');

  const [mode, setMode] = useState(propertyParam ? 'property' : clientParam ? 'client' : 'property');
  const [selectedProperty, setSelectedProperty] = useState(propertyParam || '');
  const [selectedClient, setSelectedClient] = useState(clientParam || '');
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState({});
  const [toast, setToast] = useState('');

  const buyers = (clients || []).filter(c => c.type === 'buyer' || c.type === 'both');
  const availableProps = (properties || []).filter(p => p.status === 'available');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (propertyParam) { setSelectedProperty(propertyParam); setMode('property'); }
    if (clientParam) { setSelectedClient(clientParam); setMode('client'); }
  }, [propertyParam, clientParam]);

  const runMatches = async () => {
    setLoading(true);
    setMatches(null);
    try {
      if (mode === 'property' && selectedProperty) {
        const data = await fetch(`/api/properties/${selectedProperty}/matches`).then(r => r.json());
        setMatches(data);
      } else if (mode === 'client' && selectedClient) {
        const data = await fetch(`/api/clients/${selectedClient}/matches`).then(r => r.json());
        setMatches(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((mode === 'property' && selectedProperty) || (mode === 'client' && selectedClient)) {
      runMatches();
    }
  }, [selectedProperty, selectedClient, mode]);

  const handleCreateOpportunity = async (match) => {
    const property_id = mode === 'property' ? selectedProperty : match.property?.id;
    const client_id = mode === 'client' ? selectedClient : match.client?.id;
    const key = `${property_id}-${client_id}`;

    setCreating(prev => ({ ...prev, [key]: true }));
    try {
      await apiCall('POST', '/opportunities', { property_id, client_id, status: 'interested' });
      showToast('¡Oportunidad creada con éxito!');
      // Refresh matches to update already_opportunity flag
      runMatches();
    } catch (e) {
      if (e.message.includes('already exists')) {
        showToast('Ya existe una oportunidad para esta combinación.');
      } else {
        showToast('Error: ' + e.message);
      }
    } finally {
      setCreating(prev => ({ ...prev, [key]: false }));
    }
  };

  const selectedPropData = availableProps.find(p => p.id === selectedProperty);
  const selectedClientData = buyers.find(c => c.id === selectedClient);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>✨ Smart Matches</h2>
          <p>Conecta propiedades con compradores automáticamente</p>
        </div>
      </div>

      <div className="page-body">
        {/* Toast */}
        {toast && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>✓ {toast}</div>
        )}

        {/* Mode selector + selector */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div className="tabs" style={{ marginBottom: 16 }}>
              <div className={`tab${mode === 'property' ? ' active' : ''}`} onClick={() => { setMode('property'); setMatches(null); }}>
                🏡 Buscar compradores para una propiedad
              </div>
              <div className={`tab${mode === 'client' ? ' active' : ''}`} onClick={() => { setMode('client'); setMatches(null); }}>
                👤 Buscar propiedades para un comprador
              </div>
            </div>

            {mode === 'property' ? (
              <div className="form-group" style={{ maxWidth: 480, marginBottom: 0 }}>
                <label>Selecciona una propiedad disponible</label>
                <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}>
                  <option value="">-- Elige una propiedad --</option>
                  {availableProps.map(p => (
                    <option key={p.id} value={p.id}>{p.title} – {formatPrice(p.price)} ({p.location})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group" style={{ maxWidth: 480, marginBottom: 0 }}>
                <label>Selecciona un comprador activo</label>
                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                  <option value="">-- Elige un comprador --</option>
                  {buyers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.budget_max ? `– hasta ${formatPrice(c.budget_max)}` : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Selected entity summary */}
        {(selectedPropData && mode === 'property') && (
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <strong>🏡 {selectedPropData.title}</strong>
            {' '}· {formatPrice(selectedPropData.price)} · {selectedPropData.location}
            {selectedPropData.bedrooms > 0 && ` · ${selectedPropData.bedrooms} hab.`}
          </div>
        )}
        {(selectedClientData && mode === 'client') && (
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <strong>👤 {selectedClientData.name}</strong>
            {selectedClientData.budget_max && ` · hasta ${formatPrice(selectedClientData.budget_max)}`}
            {selectedClientData.preferred_location && ` · zona: ${selectedClientData.preferred_location}`}
          </div>
        )}

        {/* Results */}
        {loading && (
          <div className="loading"><div className="spinner"/>Calculando matches...</div>
        )}

        {!loading && matches && matches.length === 0 && (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>Sin coincidencias</h3>
            <p>No se encontraron compradores compatibles con los criterios actuales.</p>
          </div>
        )}

        {!loading && matches && matches.length > 0 && (
          <>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>
                {matches.length} coincidencia{matches.length !== 1 ? 's' : ''} encontrada{matches.length !== 1 ? 's' : ''}
              </h3>
              <span className="badge badge-green">Ordenadas por compatibilidad</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {matches.map((m, i) => {
                const isProperty = mode === 'property';
                const entity = isProperty ? m.client : m.property;
                const property_id = isProperty ? selectedProperty : m.property?.id;
                const client_id = isProperty ? m.client?.id : selectedClient;
                const key = `${property_id}-${client_id}`;
                const isCreating = creating[key];

                return (
                  <div className="match-card" key={i}>
                    <ScoreCircle score={m.score} />

                    <div className="match-info">
                      {isProperty ? (
                        <>
                          <div className="match-name">{m.client.name}</div>
                          <div className="match-detail">
                            {m.client.email || m.client.phone || '—'}
                            {m.client.budget_max && ` · Presupuesto: ${formatPrice(m.client.budget_min || 0)} – ${formatPrice(m.client.budget_max)}`}
                          </div>
                          {m.client.preferred_location && (
                            <div className="match-detail">📍 {m.client.preferred_location}</div>
                          )}
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <PriorityBadge priority={m.client.priority} />
                            <TypeBadge type={m.client.type} />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="match-name">{m.property.title}</div>
                          <div className="match-detail">
                            📍 {m.property.location}{m.property.neighborhood ? `, ${m.property.neighborhood}` : ''}
                            {' '}· <strong style={{ color: 'var(--primary)' }}>{formatPrice(m.property.price)}</strong>
                          </div>
                          {m.property.bedrooms > 0 && (
                            <div className="match-detail">
                              🛏 {m.property.bedrooms} hab. · {m.property.size_m2 ? `${m.property.size_m2}m²` : ''}
                            </div>
                          )}
                          <div style={{ marginTop: 6 }}>
                            <TypeBadge type={m.property.type} />
                          </div>
                        </>
                      )}

                      <div className="match-reasons">
                        {m.reasons.map((r, j) => (
                          <span className="match-reason" key={j}>✓ {r}</span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      {m.already_opportunity ? (
                        <span className="badge badge-green">✓ En pipeline</span>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleCreateOpportunity(m)}
                          disabled={isCreating}
                        >
                          {isCreating ? '...' : '+ Crear oportunidad'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!loading && !matches && (
          <div className="empty-state">
            <div className="icon">✨</div>
            <h3>Motor de Matching Inteligente</h3>
            <p>Selecciona una propiedad o comprador para ver las mejores coincidencias automáticamente.</p>
            <p style={{ marginTop: 8 }}>El algoritmo evalúa: presupuesto, zona, tipo de inmueble y habitaciones.</p>
          </div>
        )}
      </div>
    </>
  );
}
