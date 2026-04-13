const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

const router = express.Router();

// GET all properties with seller info
router.get('/', (req, res) => {
  const { status, type, location, minPrice, maxPrice, search } = req.query;

  let query = `
    SELECT p.*, c.name as seller_name, c.phone as seller_phone
    FROM properties p
    LEFT JOIN clients c ON p.seller_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { query += ' AND p.status = ?'; params.push(status); }
  if (type) { query += ' AND p.type = ?'; params.push(type); }
  if (location) { query += ' AND (p.location LIKE ? OR p.neighborhood LIKE ?)'; params.push(`%${location}%`, `%${location}%`); }
  if (minPrice) { query += ' AND p.price >= ?'; params.push(Number(minPrice)); }
  if (maxPrice) { query += ' AND p.price <= ?'; params.push(Number(maxPrice)); }
  if (search) {
    query += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.location LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY p.created_at DESC';

  const properties = db.prepare(query).all(...params);
  res.json(properties);
});

// GET single property
router.get('/:id', (req, res) => {
  const property = db.prepare(`
    SELECT p.*, c.name as seller_name, c.phone as seller_phone, c.email as seller_email
    FROM properties p
    LEFT JOIN clients c ON p.seller_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!property) return res.status(404).json({ error: 'Property not found' });

  // Get opportunities for this property
  const opportunities = db.prepare(`
    SELECT o.*, c.name as client_name, c.phone as client_phone, c.email as client_email
    FROM opportunities o
    JOIN clients c ON o.client_id = c.id
    WHERE o.property_id = ?
    ORDER BY o.created_at DESC
  `).all(req.params.id);

  res.json({ ...property, opportunities });
});

// POST create property
router.post('/', (req, res) => {
  const { title, type, price, location, neighborhood, bedrooms, bathrooms, size_m2, description, seller_id, images } = req.body;

  if (!title || !type || !price || !location) {
    return res.status(400).json({ error: 'title, type, price, and location are required' });
  }

  const imagesJson = Array.isArray(images) ? JSON.stringify(images) : '[]';

  const id = uuidv4();
  db.prepare(`
    INSERT INTO properties (id, title, type, price, location, neighborhood, bedrooms, bathrooms, size_m2, description, seller_id, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, type, Number(price), location, neighborhood || null, bedrooms || 0, bathrooms || 0, size_m2 || null, description || null, seller_id || null, imagesJson);

  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
  res.status(201).json(property);
});

// PUT update property
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM properties WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Property not found' });

  const { title, type, price, location, neighborhood, bedrooms, bathrooms, size_m2, description, status, seller_id, images } = req.body;

  const imagesJson = Array.isArray(images) ? JSON.stringify(images) : null;

  db.prepare(`
    UPDATE properties SET
      title = COALESCE(?, title),
      type = COALESCE(?, type),
      price = COALESCE(?, price),
      location = COALESCE(?, location),
      neighborhood = COALESCE(?, neighborhood),
      bedrooms = COALESCE(?, bedrooms),
      bathrooms = COALESCE(?, bathrooms),
      size_m2 = COALESCE(?, size_m2),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      seller_id = COALESCE(?, seller_id),
      images = COALESCE(?, images),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(title, type, price ? Number(price) : null, location, neighborhood, bedrooms, bathrooms, size_m2, description, status, seller_id, imagesJson, req.params.id);

  res.json(db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id));
});

// DELETE property
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM properties WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Property not found' });

  db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
  res.json({ message: 'Property deleted' });
});

// GET smart matches for a property (which buyers fit best)
router.get('/:id/matches', (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!property) return res.status(404).json({ error: 'Property not found' });

  const buyers = db.prepare(`
    SELECT * FROM clients
    WHERE type IN ('buyer','both') AND status = 'active'
  `).all();

  const matches = buyers.map(buyer => {
    let score = 0;
    const reasons = [];

    // Budget match (40 pts)
    if (buyer.budget_min !== null && buyer.budget_max !== null) {
      if (property.price >= buyer.budget_min && property.price <= buyer.budget_max) {
        score += 40;
        reasons.push('Precio dentro del presupuesto');
      } else if (property.price <= buyer.budget_max * 1.1) {
        score += 20;
        reasons.push('Precio ligeramente sobre presupuesto');
      }
    }

    // Location match (30 pts)
    if (buyer.preferred_location) {
      const loc = buyer.preferred_location.toLowerCase();
      const propLoc = (property.location + ' ' + (property.neighborhood || '')).toLowerCase();
      if (propLoc.includes(loc) || loc.includes(property.location.toLowerCase())) {
        score += 30;
        reasons.push('Zona preferida');
      } else if (propLoc.split(' ').some(w => loc.includes(w) && w.length > 3)) {
        score += 15;
        reasons.push('Zona cercana a preferencia');
      }
    }

    // Type match (15 pts)
    if (buyer.preferred_type && buyer.preferred_type === property.type) {
      score += 15;
      reasons.push('Tipo de inmueble coincide');
    }

    // Bedrooms match (15 pts)
    if (buyer.preferred_bedrooms !== null) {
      if (property.bedrooms === buyer.preferred_bedrooms) {
        score += 15;
        reasons.push('Número de habitaciones exacto');
      } else if (Math.abs(property.bedrooms - buyer.preferred_bedrooms) === 1) {
        score += 8;
        reasons.push('Habitaciones similares');
      }
    }

    return {
      client: buyer,
      score: Math.min(score, 100),
      reasons,
      already_opportunity: false
    };
  });

  // Mark existing opportunities
  const existingOpp = db.prepare('SELECT client_id FROM opportunities WHERE property_id = ?').all(property.id);
  const existingIds = new Set(existingOpp.map(o => o.client_id));

  const result = matches
    .map(m => ({ ...m, already_opportunity: existingIds.has(m.client.id) }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  res.json(result);
});

module.exports = router;
