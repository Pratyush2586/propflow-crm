const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/activities',   require('./routes/activities'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'PropFlow CRM', version: '1.0.0' }));

// Only listen when running directly (not on Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🏡 PropFlow CRM Backend running at http://localhost:${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = app;
