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
  const buffer = fs.readFileSync(fileName);
  const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 65001 });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
};

const normalizeText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
};

const seed = async () => {
  const csvPath = path.join(process.cwd(), 'data.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`data.csv not found at ${csvPath}`);
  }

  await connectDB();
  console.log('Connected to MongoDB');

  const rows = readCsvFile(csvPath);
  console.log(`Found ${rows.length} diseases in data.csv`);

  const collection = mongoose.connection.collection('datadiseases');
  let upserted = 0;
  let updated = 0;

  for (const row of rows) {
    const name = normalizeText(row['รายชื่อโรค'] || row['name'] || row['Disease'] || row['Diseases']);
    if (!name) continue;

    const mainSymptoms = row['อาการหลัก'] || row['symptoms'] || row['Main Symptoms'] || '';
    const secondary = row['อาการรอง'] || row['subSymptoms'] || row['Secondary symptoms'] || '';
    const locations = row['ตำแหน่งที่พบบ่อย'] || row['locations'] || '';
    const cause = row['สาเหตุ'] || row['cause'] || '';
    const treatment = row['วิธีรักษาเบื้อต้น'] || row['วิธีรักษาเบื้องต้น'] || row['treatment'] || '';

    const update = {};
    const mainText = normalizeText(mainSymptoms);
    const subText = normalizeText(secondary);
    const locText = normalizeText(locations);
    const causeText = normalizeText(cause);
    const treatText = normalizeText(treatment);

    if (mainText) update.symptoms = mainText;
    if (subText) update.subSymptoms = subText;
    if (locText) update.locations = locText;
    if (causeText) update.cause = causeText;
    if (treatText) update.treatment = treatText;

    update.updatedAt = new Date();

    const result = await collection.updateOne(
      { name },
      { $set: update, $setOnInsert: { name, createdAt: new Date() } },
      { upsert: true }
    );

    if (result.upsertedCount > 0) upserted += 1;
    else if (result.modifiedCount > 0) updated += 1;
  }

  console.log(`Done. Inserted: ${upserted}, Updated: ${updated}`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed failed:', err.message || err);
  mongoose.disconnect();
  process.exit(1);
});
