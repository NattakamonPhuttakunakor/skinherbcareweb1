import mongoose from 'mongoose';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI (or MONGO_URI) in .env');
  }
  await mongoose.connect(uri);
};

const readCsvFile = (fileName) => {
  let data = fs.readFileSync(fileName, 'utf-8');
  if (data.charCodeAt(0) === 0xfeff) {
    data = data.slice(1);
  }

  const lines = data.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return { delimiter: ',', rows: [] };

  const sample = lines[0];
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const pattern = new RegExp(`("([^"]|"")*"|[^${delimiter}\\r\\n]*)(?=${delimiter}|\\r?\\n|$)`, 'g');
  const parseLine = (line) => {
    const parts = line.match(pattern) || [];
    return parts.map((part) => {
      const trimmed = part.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1).replace(/""/g, '"').trim();
      }
      return trimmed;
    });
  };

  const rows = lines.map(parseLine);
  return { delimiter, rows };
};

const normalizeText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
};

const seed = async () => {
  const csvPath = path.join(process.cwd(), 'data2.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`data2.csv not found at ${csvPath}`);
  }

  await connectDB();
  console.log('Connected to MongoDB');

  const { delimiter, rows } = readCsvFile(csvPath);
  console.log(`Found ${rows.length} lines in data2.csv (delimiter="${delimiter}")`);

  const collection = mongoose.connection.collection('diseases');
  const docs = [];
  const seenNames = new Set();

  const dataRows = rows.slice(1);
  for (const row of dataRows) {
    const name = normalizeText(row[0]);
    if (!name) continue;
    if (seenNames.has(name)) continue;

    const mainSymptoms = row[1] || '';
    const secondary = row[2] || '';
    const locations = row[3] || '';
    const cause = row[4] || '';
    const treatment = row[5] || '';

    const mainText = normalizeText(mainSymptoms);
    const subText = normalizeText(secondary);
    const locText = normalizeText(locations);
    const causeText = normalizeText(cause);
    const treatText = normalizeText(treatment);

    const symptoms = [mainText, subText, locText].filter(Boolean);
    docs.push({
      name,
      engName: '',
      description: causeText || treatText || mainText || '-',
      symptoms,
      medicines: [],
      usage: treatText,
      image: '',
      published: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    seenNames.add(name);
  }

  console.log(`Prepared ${docs.length} docs`);

  await collection.deleteMany({});
  console.log('Cleared old data in diseases');

  if (docs.length > 0) {
    const result = await collection.insertMany(docs);
    console.log(`Inserted ${result.insertedCount} docs into diseases`);
  } else {
    console.log('No docs to insert.');
  }
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed failed:', err.message || err);
  mongoose.disconnect();
  process.exit(1);
});
