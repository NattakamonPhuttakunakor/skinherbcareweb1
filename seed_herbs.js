import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, 'herbs_all1.csv');

const herbSchema = new mongoose.Schema({
  id: Number,
  name: String,
  scientificName: String,
  otherName: String,
  properties: String,
  partUsed: String,
  howToUse: String,
  benefits: String,
  caution: String,
  createdAt: Date,
});

const Herb = mongoose.model('Herb', herbSchema);

const parseDate = (value) => {
  if (!value) return null;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0));
    }
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`Missing CSV file: ${csvPath}`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const buffer = fs.readFileSync(csvPath);
  const wb = XLSX.read(buffer, { type: 'buffer', codepage: 65001 });
  const ws = wb.Sheets[wb.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });

  const docs = rows.map((row, idx) => ({
    id: Number(row.id ?? idx + 1),
    name: String(row.name || '').trim(),
    scientificName: String(row.scientificName || '').trim(),
    otherName: String(row.otherName || '').trim(),
    properties: String(row.properties || '').trim(),
    partUsed: String(row.partUsed || '').trim(),
    howToUse: String(row.howToUse || '').trim(),
    benefits: String(row.benefits || '').trim(),
    caution: String(row.caution || '').trim(),
    createdAt: parseDate(row.createdAt) || new Date(),
  })).filter((row) => row.name);

  console.log(`Prepared ${docs.length} docs`);

  await Herb.deleteMany({});
  console.log('Cleared old data');

  await Herb.insertMany(docs, { ordered: false });
  console.log('Import complete');

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Import failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
