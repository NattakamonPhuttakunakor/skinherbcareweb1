import dotenv from 'dotenv';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import path from 'path';

import Herb from '../src/models/Herb.js';
import Disease from '../src/models/Disease.js';
import User from '../src/models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

const decodeCp874 = (buf) => {
  const decoder = new TextDecoder('windows-874');
  return decoder.decode(buf);
};

const pickFirst = (row, keys) => {
  for (const k of keys) {
    if (row[k] !== undefined && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  return '';
};

const parseHerbsCsv = () => {
  const csvPath = path.resolve('herbs_all1.csv');
  const rawBuffer = readFileSync(csvPath);
  const decoded = decodeCp874(rawBuffer);
  const workbook = XLSX.read(decoded, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return rows
    .filter((r) => r && r.length >= 7)
    .map((r) => {
      const name = String(r[1]).trim();
      const scientificName = String(r[2]).trim();
      const description = String(r[4]).trim() || String(r[7]).trim();
      const usage = String(r[6]).trim() || 'โปรดปรึกษาผู้เชี่ยวชาญก่อนใช้';
      const properties = String(r[7] || '')
        .split(/[,|;]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      return {
        name,
        scientificName,
        description,
        usage,
        properties,
        published: true
      };
    })
    .filter((h) => h.name && h.scientificName && h.description);
};

const parseDiseasesXlsx = () => {
  const xlsxPath = path.resolve('src', 'data.xlsx');
  const workbook = XLSX.read(readFileSync(xlsxPath), { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rows
    .map((r) => {
      const name = pickFirst(r, [
        'รายชื่อโรค',
        'à¸£à¸²à¸¢à¸Šà¸·à¹ˆà¸­à¹‚à¸£à¸„'
      ]);
      const main = pickFirst(r, [
        'อาการหลัก',
        'à¸­à¸²à¸à¸²à¸£à¸«à¸¥à¸±à¸'
      ]);
      const secondary = pickFirst(r, [
        'อาการรอง',
        'à¸­à¸²à¸à¸²à¸£à¸£à¸­à¸‡'
      ]);
      const location = pickFirst(r, [
        'ตำแหน่งที่พบบ่อย',
        'à¸•à¸³à¹à¸«à¸™à¹ˆà¸‡à¸—à¸µà¹ˆà¸žà¸šà¸šà¹ˆà¸­à¸¢'
      ]);
      const cause = pickFirst(r, [
        'สาเหตุ',
        'à¸ªà¸²à¹€à¸«à¸•à¸¸'
      ]);
      const treatment = pickFirst(r, [
        'วิธีรักษาเบื้อต้น',
        'à¸§à¸´à¸˜à¸µà¸£à¸±à¸à¸©à¸²à¹€à¸šà¸·à¹‰à¸­à¸•à¹‰à¸™'
      ]);

      const description = [location, cause].filter(Boolean).join('\n');
      const symptoms = [main, secondary].filter(Boolean);

      return {
        name,
        description: description || main || secondary || 'ไม่พบรายละเอียด',
        symptoms,
        usage: treatment,
        medicines: [],
        published: true
      };
    })
    .filter((d) => d.name && d.description);
};

const main = async () => {
  await mongoose.connect(MONGODB_URI);
  const adminUser =
    (await User.findOne({ role: 'admin' })) ||
    (await User.findOne({}));

  if (!adminUser) {
    console.error('No user found in database. Please create an admin user first.');
    process.exit(1);
  }

  const herbs = parseHerbsCsv();
  const diseases = parseDiseasesXlsx();

  let herbCreated = 0;
  let herbUpdated = 0;
  for (const herb of herbs) {
    const res = await Herb.findOneAndUpdate(
      { scientificName: herb.scientificName },
      { ...herb, addedBy: adminUser._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (res.createdAt && res.updatedAt && res.createdAt.getTime() === res.updatedAt.getTime()) {
      herbCreated += 1;
    } else {
      herbUpdated += 1;
    }
  }

  let diseaseCreated = 0;
  let diseaseUpdated = 0;
  for (const disease of diseases) {
    const res = await Disease.findOneAndUpdate(
      { name: disease.name },
      disease,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (res.createdAt && res.updatedAt && res.createdAt.getTime() === res.updatedAt.getTime()) {
      diseaseCreated += 1;
    } else {
      diseaseUpdated += 1;
    }
  }

  console.log('Seed completed (direct DB)');
  console.log(`Herbs: created ${herbCreated}, updated ${herbUpdated}`);
  console.log(`Diseases: created ${diseaseCreated}, updated ${diseaseUpdated}`);

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
