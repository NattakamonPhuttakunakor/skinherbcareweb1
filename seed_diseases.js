import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import csv from 'csv-parser';

dotenv.config();

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('Missing MONGODB_URI (or MONGO_URI) in .env');
  await mongoose.connect(uri);
};

const normalizeText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
};

const parseCsvRows = async (csvPath) => {
  const rows = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv({
        headers: ['name', 'symptoms', 'subSymptoms', 'locations', 'cause', 'treatment'],
        skipLines: 1,
        quote: '"',
        escape: '"',
        newline: '\n'
      }))
      .on('data', (row) => {
        const name = normalizeText((row.name || '').split('\n')[0]);
        if (!name || name === 'name' || name.length > 100) return;

        rows.push({
          name,
          symptoms: normalizeText(row.symptoms),
          subSymptoms: normalizeText(row.subSymptoms),
          locations: normalizeText(row.locations),
          cause: normalizeText(row.cause),
          treatment: normalizeText(row.treatment),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  return rows;
};

const seed = async () => {
  const csvPath = path.join(process.cwd(), 'data2.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`data2.csv not found at ${csvPath}`);
  }

  await connectDB();
  console.log('Connected to MongoDB');

  const collection = mongoose.connection.collection('datadiseases');
  const docs = await parseCsvRows(csvPath);

  console.log(`Prepared ${docs.length} docs`);

  await collection.deleteMany({});
  console.log('Cleared old data in datadiseases');

  if (docs.length > 0) {
    const result = await collection.insertMany(docs);
    console.log(`Inserted ${result.insertedCount} docs into datadiseases`);
    console.log('Sample first name:', docs[0].name);
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
