import { useState } from 'react';
import { useApi, apiCall } from '../hooks/useApi';
import { PriorityBadge, ScoreBadge } from '../components/Badges';

function formatPrice(p) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p);
}

const COLUMNS = [
  { key: 'interested', label: 'Interesado', color: '#3b82f6', emoji: '👀' },
  { key: 'visiting', label: 'Visita', color: '#8b5cf6', emoji: '🚪' },
  { key: 'negotiating', label: 'Negociando', color: '#f59e0b', emoji: '🤝' },
  { key: 'closed_won', label: 'Ganado', color: '#10b981', emoji: '🎉' },
  { key: 'closed_lost', label: 'Perdido', color: '#ef4444', emoji: '❌' },
];

function OppDetailModal({ opp, onClose, onUpdate }) {
  const [status, setStatus] = useState(opp.status);
  const [notes, setNotes] = useState(opp.notes || '');
  const [priority, setPriority] = useState(opp.priority);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiCall('PUT', `/opportunities/${opp.id}`, { status, notes, priority });
      onUpdate();
      onClose();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta oportunidad?')) return;
    try {
      await apiCall('DELETE', `/opportunities/${opp.id}`);
      onUpdate();
      onClose();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Oportunidad</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>🏡 {opp.property_title}</div>
            <div style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 2 }}>📍 {opp.property_location}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(opp.property_price)}</div>
          </div>

          <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>👤 {opp.client_name}</div>
            <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>{opp.client_phone || opp.client_email || '—'}</div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <ScoreBadge score={opp.match_score} />
            <PriorityBadge priority={opp.priority} />
          </div>

          <div className="form-group">
            <label>Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="interested">👀 Interesado</option>
              <option value="visiting">🚪 Visita programada</option>
              <option value="negotiating">🤝 En negociación</option>
              <option value="closed_won">🎉 Cerrado - Ganado</option>
              <option value="closed_lost">❌ Cerrado - Perdido</option>
            </select>
          </div>
          <div className="form-group">
            <label>Prioridad</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="high">↑ Alta</option>
              <option value="medium">→ Media</option>
              <option value="low">↓ Baja</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Detalles de la negociación..." />
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>Eliminar</button>
          <div className="flex gap-8">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { data: pipeline, loading, refetch } = useApi('/opportunities/pipeline');
  const [selected, setSelected] = useState(null);

  const totalActive = pipeline ? COLUMNS.slice(0, 3).reduce((sum, c) => sum + (pipeline[c.key]?.length || 0), 0) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Pipeline de Oportunidades</h2>
          <p>{totalActive} oportunidades activas</p>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading"><div className="spinner"/>Cargando pipeline...</div>
        ) : !pipeline ? null : (
          <div className="pipeline-board">
            {COLUMNS.map(col => {
              const items = pipeline[col.key] || [];
              return (
                <div className="pipeline-column" key={col.key}>
                  <div className="pipeline-col-header">
                    <span className="pipeline-col-title">{col.emoji} {col.label}</span>
                    <span className="pipeline-count" style={{ background: col.color, color: 'white' }}>{items.length}</span>
                  </div>

                  {items.length === 0 && (
                    <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 12, color: 'var(--gray-400)' }}>
                      Sin oportunidades
                    </div>
                  )}

                  {items.map(opp => (
                    <div className="opp-card" key={opp.id} onClick={() => setSelected(opp)}>
                      <div className="opp-card-title">{opp.property_title}</div>
                      <div className="opp-card-sub">👤 {opp.client_name}</div>
                      <div className="opp-card-sub">📍 {opp.property_neighborhood || opp.property_location}</div>
                      <div className="flex flex-center" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                        <div className="opp-card-price">{formatPrice(opp.property_price)}</div>
                        <PriorityBadge priority={opp.client_priority} />
                      </div>
                      {opp.match_score > 0 && (
                        <>
                          <div className="score-bar" style={{ marginTop: 8 }}>
                            <div className="score-fill" style={{ width: `${opp.match_score}%` }} />
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 3 }}>
                            Match: {opp.match_score}%
                          </div>
                        </>
                      )}
                      {opp.notes && (
                        <div style={{ fontSize: 11.5, color: 'var(--gray-500)', marginTop: 6, borderTop: '1px solid var(--gray-100)', paddingTop: 6 }}>
                          {opp.notes.length > 60 ? opp.notes.slice(0, 60) + '…' : opp.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <OppDetailModal
          opp={selected}
          onClose={() => setSelected(null)}
          onUpdate={refetch}
        />
      )}
    </>
  );
}
