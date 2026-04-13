const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/stats', (req, res) => {
  const totalProperties = db.prepare("SELECT COUNT(*) as c FROM properties").get().c;
  const availableProperties = db.prepare("SELECT COUNT(*) as c FROM properties WHERE status = 'available'").get().c;
  const reservedProperties = db.prepare("SELECT COUNT(*) as c FROM properties WHERE status = 'reserved'").get().c;
  const soldProperties = db.prepare("SELECT COUNT(*) as c FROM properties WHERE status = 'sold'").get().c;

  const totalClients = db.prepare("SELECT COUNT(*) as c FROM clients").get().c;
  const activeBuyers = db.prepare("SELECT COUNT(*) as c FROM clients WHERE type IN ('buyer','both') AND status = 'active'").get().c;
  const activeSellers = db.prepare("SELECT COUNT(*) as c FROM clients WHERE type IN ('seller','both') AND status = 'active'").get().c;

  const totalOpportunities = db.prepare("SELECT COUNT(*) as c FROM opportunities").get().c;
  const activeOpportunities = db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE status NOT IN ('closed_won','closed_lost')").get().c;
  const closedWon = db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE status = 'closed_won'").get().c;
  const negotiating = db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE status = 'negotiating'").get().c;

  const avgMatchScore = db.prepare("SELECT AVG(match_score) as avg FROM opportunities WHERE match_score > 0").get().avg;

  // Top opportunities by score
  const topOpportunities = db.prepare(`
    SELECT o.*, p.title as property_title, p.price, c.name as client_name, c.priority as client_priority
    FROM opportunities o
    JOIN properties p ON o.property_id = p.id
    JOIN clients c ON o.client_id = c.id
    WHERE o.status NOT IN ('closed_won','closed_lost')
    ORDER BY o.match_score DESC
    LIMIT 5
  `).all();

  // Recent properties
  const recentProperties = db.prepare(`
    SELECT * FROM properties ORDER BY created_at DESC LIMIT 4
  `).all();

  // High priority clients without recent contact (more than 7 days)
  const coldLeads = db.prepare(`
    SELECT * FROM clients
    WHERE status = 'active' AND type IN ('buyer','both')
    AND (last_contact IS NULL OR last_contact < datetime('now', '-7 days'))
    ORDER BY priority DESC
    LIMIT 5
  `).all();

  // Pipeline summary
  const pipeline = db.prepare(`
    SELECT o.status, COUNT(*) as count, SUM(p.price) as total_value
    FROM opportunities o
    JOIN properties p ON o.property_id = p.id
    GROUP BY o.status
  `).all();

  res.json({
    properties: { total: totalProperties, available: availableProperties, reserved: reservedProperties, sold: soldProperties },
    clients: { total: totalClients, activeBuyers, activeSellers },
    opportunities: { total: totalOpportunities, active: activeOpportunities, closedWon, negotiating, avgMatchScore: Math.round(avgMatchScore || 0) },
    topOpportunities,
    recentProperties,
    coldLeads,
    pipeline
  });
});

// GET analytics data — used by the Analytics page
router.get('/analytics', (req, res) => {
  // Closed deals grouped by month (last 6 months)
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', o.updated_at) as month,
      COUNT(*) as deals,
      SUM(p.price) as revenue
    FROM opportunities o
    JOIN properties p ON o.property_id = p.id
    WHERE o.status = 'closed_won'
      AND o.updated_at >= datetime('now', '-6 months')
    GROUP BY month
    ORDER BY month ASC
  `).all();

  // Pipeline value per stage
  const pipelineStages = db.prepare(`
    SELECT o.status, COUNT(*) as count, COALESCE(SUM(p.price), 0) as total_value
    FROM opportunities o
    JOIN properties p ON o.property_id = p.id
    GROUP BY o.status
    ORDER BY CASE o.status
      WHEN 'interested'  THEN 1
      WHEN 'visiting'    THEN 2
      WHEN 'negotiating' THEN 3
      WHEN 'closed_won'  THEN 4
      WHEN 'closed_lost' THEN 5
      ELSE 6
    END
  `).all();

  // Conversion totals
  const totalOpps = db.prepare('SELECT COUNT(*) as c FROM opportunities').get().c;
  const wonOpps   = db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE status = 'closed_won'").get().c;
  const lostOpps  = db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE status = 'closed_lost'").get().c;

  const totalRevenue = db.prepare(`
    SELECT COALESCE(SUM(p.price), 0) as total
    FROM opportunities o JOIN properties p ON o.property_id = p.id
    WHERE o.status = 'closed_won'
  `).get().total;

  // Top properties by buyer interest
  const topProperties = db.prepare(`
    SELECT p.id, p.title, p.location, p.price, p.type, p.status,
      COUNT(o.id) as opp_count, ROUND(AVG(o.match_score), 0) as avg_score
    FROM properties p JOIN opportunities o ON o.property_id = p.id
    GROUP BY p.id
    ORDER BY opp_count DESC, avg_score DESC
    LIMIT 5
  `).all();

  // Activity breakdown by type
  const activityBreakdown = db.prepare(`
    SELECT type, COUNT(*) as count FROM activities GROUP BY type ORDER BY count DESC
  `).all();

  // Avg days from creation to close
  const avgDaysRow = db.prepare(`
    SELECT AVG(CAST((julianday(updated_at) - julianday(created_at)) AS REAL)) as avg_days
    FROM opportunities WHERE status = 'closed_won'
  `).get();

  res.json({
    monthly,
    pipelineStages,
    conversion: {
      total:  totalOpps,
      won:    wonOpps,
      lost:   lostOpps,
      active: totalOpps - wonOpps - lostOpps,
      rate:   totalOpps > 0 ? Math.round((wonOpps / totalOpps) * 100) : 0,
    },
    totalRevenue,
    topProperties,
    activityBreakdown,
    avgDaysToClose: avgDaysRow?.avg_days ? Math.round(avgDaysRow.avg_days) : 0,
  });
});

module.exports = router;

