const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('d:/Depoii_nextjs/data/depoii.sqlite');

const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='permits'").get();
console.log('Permits table schema:\n', schema.sql);

const cols = db.prepare("PRAGMA table_info(permits)").all();
console.log('Columns:', cols.map(c => `${c.name} (${c.type})`).join(', '));

// Read frisco permits
const frisco = JSON.parse(fs.readFileSync('C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/frisco_permits_new_view_roofing.json', 'utf8'));

// Prepare insert statement
// Check if permit_number exists or what unique constraint exists
console.log('Frisco permits to insert:', frisco.length);

