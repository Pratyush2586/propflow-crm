const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

const router = express.Router();

// GET activities — filterable by client_id, property_id, opportunity_id
router.get('/', (req, res) => {
  const { client_id, property_id, opportunity_id } = req.query;

  let query = `
    SELECT a.*, c.name as client_name, p.title as property_title
    FROM activities a
    LEFT JOIN clients c ON a.client_id = c.id
    LEFT JOIN properties p ON a.property_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (client_id)      { query += ' AND a.client_id = ?';      params.push(client_id); }
  if (property_id)    { query += ' AND a.property_id = ?';    params.push(property_id); }
  if (opportunity_id) { query += ' AND a.opportunity_id = ?'; params.push(opportunity_id); }

  query += ' ORDER BY a.created_at DESC LIMIT 50';
  res.json(db.prepare(query).all(...params));
});

// POST create activity
router.post('/', (req, res) => {
  const { type, title, description, client_id, property_id, opportunity_id, due_date } = req.body;
  if (!type || !title) return res.status(400).json({ error: 'type and title are required' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO activities (id, type, title, description, client_id, property_id, opportunity_id, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, type, title, description || null, client_id || null, property_id || null, opportunity_id || null, due_date || null);

  // Bump last_contact so cold-lead logic stays accurate
  if (client_id) {
    db.prepare(`UPDATE clients SET last_contact = datetime('now') WHERE id = ?`).run(client_id);
  }

  res.status(201).json(db.prepare('SELECT * FROM activities WHERE id = ?').get(id));
});

// PUT update activity (toggle complete, edit text)
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM activities WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Activity not found' });

  const { completed, title, description, due_date } = req.body;
  db.prepare(`
    UPDATE activities SET
      completed   = COALESCE(?, completed),
      title       = COALESCE(?, title),
      description = COALESCE(?, description),
      due_date    = COALESCE(?, due_date)
    WHERE id = ?
  `).run(
    completed !== undefined ? (completed ? 1 : 0) : null,
    title       || null,
    description || null,
    due_date    || null,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id));
});

// DELETE activity
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  res.json({ message: 'Activity deleted' });
});

module.exports = router;
