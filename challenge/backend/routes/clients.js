const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

const router = express.Router();

// GET all clients
router.get('/', (req, res) => {
  const { type, status, priority, search } = req.query;

  let query = 'SELECT * FROM clients WHERE 1=1';
  const params = [];

  if (type) { query += ' AND type = ?'; params.push(type); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';
  const clients = db.prepare(query).all(...params);

  // Add opportunity count
  const withCounts = clients.map(c => {
    const oppCount = db.prepare('SELECT COUNT(*) as count FROM opportunities WHERE client_id = ?').get(c.id);
    return { ...c, opportunity_count: oppCount.count };
  });

  res.json(withCounts);
});

// GET single client
router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const opportunities = db.prepare(`
    SELECT o.*, p.title as property_title, p.price as property_price, p.location as property_location, p.type as property_type
    FROM opportunities o
    JOIN properties p ON o.property_id = p.id
    WHERE o.client_id = ?
    ORDER BY o.created_at DESC
  `).all(req.params.id);

  const activities = db.prepare(`
    SELECT * FROM activities WHERE client_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.params.id);

  res.json({ ...client, opportunities, activities });
});

// POST create client
router.post('/', (req, res) => {
  const { name, email, phone, type, budget_min, budget_max, preferred_location, preferred_type, preferred_bedrooms, notes, priority } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO clients (id, name, email, phone, type, budget_min, budget_max, preferred_location, preferred_type, preferred_bedrooms, notes, priority, last_contact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, name, email || null, phone || null, type, budget_min || null, budget_max || null, preferred_location || null, preferred_type || null, preferred_bedrooms || null, notes || null, priority || 'medium');

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  res.status(201).json(client);
});

// PUT update client
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  const { name, email, phone, type, status, budget_min, budget_max, preferred_location, preferred_type, preferred_bedrooms, notes, priority } = req.body;

  db.prepare(`
    UPDATE clients SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      type = COALESCE(?, type),
      status = COALESCE(?, status),
      budget_min = COALESCE(?, budget_min),
      budget_max = COALESCE(?, budget_max),
      preferred_location = COALESCE(?, preferred_location),
      preferred_type = COALESCE(?, preferred_type),
      preferred_bedrooms = COALESCE(?, preferred_bedrooms),
      notes = COALESCE(?, notes),
      priority = COALESCE(?, priority),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(name, email, phone, type, status, budget_min, budget_max, preferred_location, preferred_type, preferred_bedrooms, notes, priority, req.params.id);

  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

// DELETE client
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ message: 'Client deleted' });
});

// GET best property matches for a buyer client
router.get('/:id/matches', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const properties = db.prepare(`
    SELECT p.*, c.name as seller_name FROM properties p
    LEFT JOIN clients c ON p.seller_id = c.id
    WHERE p.status = 'available'
  `).all();

  const matches = properties.map(prop => {
    let score = 0;
    const reasons = [];

    // Budget match (40 pts)
    if (client.budget_min !== null && client.budget_max !== null) {
      if (prop.price >= client.budget_min && prop.price <= client.budget_max) {
        score += 40;
        reasons.push('Dentro del presupuesto');
      } else if (prop.price <= client.budget_max * 1.1) {
        score += 20;
        reasons.push('Ligeramente sobre presupuesto');
      }
    }

    // Location match (30 pts)
    if (client.preferred_location) {
      const loc = client.preferred_location.toLowerCase();
      const propLoc = (prop.location + ' ' + (prop.neighborhood || '')).toLowerCase();
      if (propLoc.includes(loc) || loc.includes(prop.location.toLowerCase())) {
        score += 30;
        reasons.push('Zona preferida');
      } else if (propLoc.split(' ').some(w => loc.includes(w) && w.length > 3)) {
        score += 15;
        reasons.push('Zona similar');
      }
    }

    // Type match (15 pts)
    if (client.preferred_type && client.preferred_type === prop.type) {
      score += 15;
      reasons.push('Tipo coincide');
    }

    // Bedrooms match (15 pts)
    if (client.preferred_bedrooms !== null) {
      if (prop.bedrooms === client.preferred_bedrooms) {
        score += 15;
        reasons.push('Habitaciones exactas');
      } else if (Math.abs(prop.bedrooms - client.preferred_bedrooms) === 1) {
        score += 8;
        reasons.push('Habitaciones similares');
      }
    }

    return { property: prop, score: Math.min(score, 100), reasons };
  });

  const result = matches.filter(m => m.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
  res.json(result);
});

module.exports = router;
