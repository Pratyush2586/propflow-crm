const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

const router = express.Router();

const STATUS_ORDER = ['interested', 'visiting', 'negotiating', 'closed_won', 'closed_lost'];

// GET all opportunities (pipeline view)
router.get('/', (req, res) => {
  const { status, priority } = req.query;

  let query = `
    SELECT o.*,
      p.title as property_title, p.price as property_price,
      p.location as property_location, p.type as property_type,
      p.bedrooms as property_bedrooms, p.neighborhood as property_neighborhood,
      c.name as client_name, c.email as client_email, c.phone as client_phone,
      c.type as client_type, c.priority as client_priority
    FROM opportunities o
    JOIN properties p ON o.property_id = p.id
    JOIN clients c ON o.client_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { query += ' AND o.status = ?'; params.push(status); }
  if (priority) { query += ' AND o.priority = ?'; params.push(priority); }

  query += ' ORDER BY o.updated_at DESC';

  const opportunities = db.prepare(query).all(...params);
  res.json(opportunities);
});

// GET pipeline grouped by status
router.get('/pipeline', (req, res) => {
  const opportunities = db.prepare(`
    SELECT o.*,
      p.title as property_title, p.price as property_price,
      p.location as property_location, p.type as property_type,
      p.neighborhood as property_neighborhood,
      c.name as client_name, c.phone as client_phone,
      c.priority as client_priority
    FROM opportunities o
    JOIN properties p ON o.property_id = p.id
    JOIN clients c ON o.client_id = c.id
    ORDER BY o.match_score DESC
  `).all();

  const pipeline = {};
  for (const s of STATUS_ORDER) {
    pipeline[s] = opportunities.filter(o => o.status === s);
  }

  res.json(pipeline);
});

// GET single opportunity
router.get('/:id', (req, res) => {
  const opp = db.prepare(`
    SELECT o.*,
      p.title as property_title, p.price as property_price,
      p.location as property_location, p.type as property_type,
      p.bedrooms as property_bedrooms, p.size_m2 as property_size,
      c.name as client_name, c.email as client_email, c.phone as client_phone
    FROM opportunities o
    JOIN properties p ON o.property_id = p.id
    JOIN clients c ON o.client_id = c.id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
  res.json(opp);
});

// POST create opportunity
router.post('/', (req, res) => {
  const { property_id, client_id, status, notes, priority } = req.body;

  if (!property_id || !client_id) {
    return res.status(400).json({ error: 'property_id and client_id are required' });
  }

  // Check no duplicate
  const existing = db.prepare('SELECT id FROM opportunities WHERE property_id = ? AND client_id = ?').get(property_id, client_id);
  if (existing) {
    return res.status(409).json({ error: 'Opportunity already exists for this property+client combination', id: existing.id });
  }

  // Calculate match score
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(property_id);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);

  if (!property || !client) {
    return res.status(404).json({ error: 'Property or client not found' });
  }

  let score = 0;
  if (client.budget_min !== null && client.budget_max !== null) {
    if (property.price >= client.budget_min && property.price <= client.budget_max) score += 40;
    else if (property.price <= client.budget_max * 1.1) score += 20;
  }
  if (client.preferred_location) {
    const loc = client.preferred_location.toLowerCase();
    const propLoc = (property.location + ' ' + (property.neighborhood || '')).toLowerCase();
    if (propLoc.includes(loc) || loc.includes(property.location.toLowerCase())) score += 30;
    else if (propLoc.split(' ').some(w => loc.includes(w) && w.length > 3)) score += 15;
  }
  if (client.preferred_type && client.preferred_type === property.type) score += 15;
  if (client.preferred_bedrooms !== null) {
    if (property.bedrooms === client.preferred_bedrooms) score += 15;
    else if (Math.abs(property.bedrooms - client.preferred_bedrooms) === 1) score += 8;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO opportunities (id, property_id, client_id, status, notes, priority, match_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, property_id, client_id, status || 'interested', notes || null, priority || 'medium', Math.min(score, 100));

  // Update client last_contact
  db.prepare("UPDATE clients SET last_contact = datetime('now') WHERE id = ?").run(client_id);

  const opp = db.prepare(`
    SELECT o.*, p.title as property_title, c.name as client_name
    FROM opportunities o JOIN properties p ON o.property_id = p.id JOIN clients c ON o.client_id = c.id
    WHERE o.id = ?
  `).get(id);
  res.status(201).json(opp);
});

// PUT update opportunity
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM opportunities WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Opportunity not found' });

  const { status, notes, priority } = req.body;

  db.prepare(`
    UPDATE opportunities SET
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      priority = COALESCE(?, priority),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(status, notes, priority, req.params.id);

  // If closed_won, mark property as reserved
  if (status === 'closed_won') {
    const opp = db.prepare('SELECT property_id FROM opportunities WHERE id = ?').get(req.params.id);
    db.prepare("UPDATE properties SET status = 'reserved', updated_at = datetime('now') WHERE id = ?").run(opp.property_id);
  }

  const opp = db.prepare(`
    SELECT o.*, p.title as property_title, c.name as client_name
    FROM opportunities o JOIN properties p ON o.property_id = p.id JOIN clients c ON o.client_id = c.id
    WHERE o.id = ?
  `).get(req.params.id);
  res.json(opp);
});

// DELETE opportunity
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM opportunities WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Opportunity not found' });

  db.prepare('DELETE FROM opportunities WHERE id = ?').run(req.params.id);
  res.json({ message: 'Opportunity deleted' });
});

module.exports = router;
