const Database = require('better-sqlite3');
const path = require('path');

// On Vercel, /tmp is the only writable directory (ephemeral — reseeds on cold start)
const DB_PATH = process.env.VERCEL
  ? '/tmp/propflow.db'
  : path.join(__dirname, 'propflow.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('apartment','house','office','land','commercial')),
      price REAL NOT NULL,
      location TEXT NOT NULL,
      neighborhood TEXT,
      bedrooms INTEGER DEFAULT 0,
      bathrooms INTEGER DEFAULT 0,
      size_m2 REAL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','reserved','sold')),
      seller_id TEXT,
      images TEXT DEFAULT '[]',
      amenities TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(seller_id) REFERENCES clients(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      type TEXT NOT NULL CHECK(type IN ('buyer','seller','both')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','closed')),
      budget_min REAL,
      budget_max REAL,
      preferred_location TEXT,
      preferred_type TEXT,
      preferred_bedrooms INTEGER,
      notes TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
      last_contact TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'interested' CHECK(status IN ('interested','visiting','negotiating','closed_won','closed_lost')),
      notes TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
      match_score REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('call','email','visit','note','reminder')),
      title TEXT NOT NULL,
      description TEXT,
      client_id TEXT,
      property_id TEXT,
      opportunity_id TEXT,
      due_date TEXT,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE SET NULL,
      FOREIGN KEY(opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL
    );
  `);

  // Seed demo data if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM properties').get();
  if (count.c === 0) {
    seedDemoData();
  }
}

function seedDemoData() {
  // Fixed IDs — never change between reseeds so bookmarked URLs always work
  const sellers = [
    { id: 'c1000000-0000-0000-0000-000000000001', name: 'Carlos Mendoza',            email: 'carlos@email.com', phone: '+34 611 222 333', type: 'seller', status: 'active', priority: 'medium' },
    { id: 'c1000000-0000-0000-0000-000000000002', name: 'Ana García',                email: 'ana@email.com',    phone: '+34 622 333 444', type: 'seller', status: 'active', priority: 'high'   },
    { id: 'c1000000-0000-0000-0000-000000000003', name: 'Empresa Inmobiliaria López', email: 'lopez@inmob.com', phone: '+34 633 444 555', type: 'both',   status: 'active', priority: 'high'   },
  ];

  const buyers = [
    { id: 'c2000000-0000-0000-0000-000000000001', name: 'María Rodríguez', email: 'maria@email.com',   phone: '+34 644 555 666', type: 'buyer', status: 'active',   budget_min: 180000, budget_max: 250000, preferred_location: 'Madrid Centro',     preferred_type: 'apartment', preferred_bedrooms: 2, priority: 'high'   },
    { id: 'c2000000-0000-0000-0000-000000000002', name: 'Juan Pérez',      email: 'juan@email.com',    phone: '+34 655 666 777', type: 'buyer', status: 'active',   budget_min: 300000, budget_max: 450000, preferred_location: 'Barcelona',           preferred_type: 'house',     preferred_bedrooms: 3, priority: 'high'   },
    { id: 'c2000000-0000-0000-0000-000000000003', name: 'Laura Sánchez',   email: 'laura@email.com',   phone: '+34 666 777 888', type: 'buyer', status: 'active',   budget_min: 120000, budget_max: 180000, preferred_location: 'Madrid',              preferred_type: 'apartment', preferred_bedrooms: 1, priority: 'medium' },
    { id: 'c2000000-0000-0000-0000-000000000004', name: 'Roberto Torres',  email: 'roberto@email.com', phone: '+34 677 888 999', type: 'buyer', status: 'active',   budget_min: 400000, budget_max: 600000, preferred_location: 'Barcelona Eixample',  preferred_type: 'house',     preferred_bedrooms: 4, priority: 'medium' },
    { id: 'c2000000-0000-0000-0000-000000000005', name: 'Sofía Martín',    email: 'sofia@email.com',   phone: '+34 688 999 000', type: 'buyer', status: 'inactive', budget_min: 200000, budget_max: 280000, preferred_location: 'Valencia',            preferred_type: 'apartment', preferred_bedrooms: 2, priority: 'low'    },
  ];

  const insertClient = db.prepare(`
    INSERT INTO clients (id, name, email, phone, type, status, budget_min, budget_max, preferred_location, preferred_type, preferred_bedrooms, priority, last_contact)
    VALUES (@id, @name, @email, @phone, @type, @status, @budget_min, @budget_max, @preferred_location, @preferred_type, @preferred_bedrooms, @priority, @last_contact)
  `);

  for (const c of [...sellers, ...buyers]) {
    insertClient.run({
      ...c,
      budget_min: c.budget_min || null, budget_max: c.budget_max || null,
      preferred_location: c.preferred_location || null, preferred_type: c.preferred_type || null,
      preferred_bedrooms: c.preferred_bedrooms || null,
      last_contact: new Date(Date.now() - Math.random() * 7 * 24 * 3600000).toISOString(),
    });
  }

  const properties = [
    { id: 'p0000000-0000-0000-0000-000000000001', title: 'Piso luminoso en Malasaña',    type: 'apartment',  price: 220000, location: 'Madrid Centro',    neighborhood: 'Malasaña',     bedrooms: 2, bathrooms: 1, size_m2: 75,  description: 'Precioso piso reformado en el corazón de Malasaña. Mucha luz natural, suelos de parquet, cocina americana.',                                      status: 'available', seller_id: sellers[0].id },
    { id: 'p0000000-0000-0000-0000-000000000002', title: 'Chalet adosado con jardín',    type: 'house',      price: 380000, location: 'Barcelona',         neighborhood: 'Sarrià',       bedrooms: 4, bathrooms: 2, size_m2: 180, description: 'Espectacular chalet adosado con jardín privado de 60m². Zona residencial tranquila con buenas comunicaciones.',                                  status: 'available', seller_id: sellers[1].id },
    { id: 'p0000000-0000-0000-0000-000000000003', title: 'Estudio moderno en Gràcia',    type: 'apartment',  price: 145000, location: 'Barcelona',         neighborhood: 'Gràcia',       bedrooms: 1, bathrooms: 1, size_m2: 42,  description: 'Estudio completamente equipado y amueblado. Perfecto para inversión o primera vivienda.',                                                        status: 'available', seller_id: sellers[2].id },
    { id: 'p0000000-0000-0000-0000-000000000004', title: 'Ático dúplex con terraza',     type: 'apartment',  price: 495000, location: 'Barcelona Eixample', neighborhood: 'Eixample Dret', bedrooms: 3, bathrooms: 2, size_m2: 130, description: 'Impresionante ático dúplex con terraza de 45m². Vistas panorámicas a la ciudad. Garaje incluido.',                                             status: 'available', seller_id: sellers[1].id },
    { id: 'p0000000-0000-0000-0000-000000000005', title: 'Piso en Lavapiés',             type: 'apartment',  price: 175000, location: 'Madrid',            neighborhood: 'Lavapiés',     bedrooms: 2, bathrooms: 1, size_m2: 65,  description: 'Piso reformado en barrio multicultural. Ideal para jóvenes. Cerca de metro y servicios.',                                                        status: 'reserved',  seller_id: sellers[0].id },
    { id: 'p0000000-0000-0000-0000-000000000006', title: 'Local comercial en zona prime', type: 'commercial', price: 320000, location: 'Madrid Centro',    neighborhood: 'Gran Vía',     bedrooms: 0, bathrooms: 1, size_m2: 95,  description: 'Excelente local comercial en Gran Vía. Alto tráfico peatonal. Ideal para franquicia o comercio.',                                               status: 'available', seller_id: sellers[2].id },
    { id: 'p0000000-0000-0000-0000-000000000007', title: 'Casa unifamiliar en Valencia', type: 'house',      price: 260000, location: 'Valencia',          neighborhood: 'Campanar',     bedrooms: 3, bathrooms: 2, size_m2: 150, description: 'Amplia casa unifamiliar con piscina privada y garaje doble. Zona residencial con colegios cercanos.',                                          status: 'available', seller_id: sellers[0].id },
  ];

  const insertProperty = db.prepare(`
    INSERT INTO properties (id, title, type, price, location, neighborhood, bedrooms, bathrooms, size_m2, description, status, seller_id)
    VALUES (@id, @title, @type, @price, @location, @neighborhood, @bedrooms, @bathrooms, @size_m2, @description, @status, @seller_id)
  `);

  for (const p of properties) {
    insertProperty.run(p);
  }

  const insertOpp = db.prepare(`
    INSERT INTO opportunities (id, property_id, client_id, status, notes, priority, match_score)
    VALUES (@id, @property_id, @client_id, @status, @notes, @priority, @match_score)
  `);

  insertOpp.run({ id: 'op000000-0000-0000-0000-000000000001', property_id: properties[0].id, client_id: buyers[0].id, status: 'visiting',    notes: 'La clienta está muy interesada. Visita programada para el viernes.', priority: 'high',   match_score: 92 });
  insertOpp.run({ id: 'op000000-0000-0000-0000-000000000002', property_id: properties[1].id, client_id: buyers[1].id, status: 'negotiating', notes: 'En negociación. El cliente quiere bajar 15k.',                        priority: 'high',   match_score: 88 });
  insertOpp.run({ id: 'op000000-0000-0000-0000-000000000003', property_id: properties[2].id, client_id: buyers[2].id, status: 'interested',  notes: 'Primer contacto positivo.',                                          priority: 'medium', match_score: 78 });
}

initDB();

module.exports = db;
