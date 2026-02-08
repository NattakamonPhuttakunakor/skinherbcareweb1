import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import path from 'path';

const API_BASE_URL = process.env.API_BASE_URL || 'https://skinherbcareweb1.onrender.com';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const DRY_RUN = process.argv.includes('--dry');

if (!ADMIN_TOKEN) {
  console.error('Missing ADMIN_TOKEN. Set env ADMIN_TOKEN to an admin JWT token.');
  process.exit(1);
}

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${ADMIN_TOKEN}`
    }
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  return { ok: res.ok, status: res.status, data };
};

const decodeCp874 = (buf) => {
  const decoder = new TextDecoder('windows-874');
  return decoder.decode(buf);
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
      const name = String(r['รายชื่อโรค'] || '').trim();
      const main = String(r['อาการหลัก'] || '').trim();
      const secondary = String(r['อาการรอง'] || '').trim();
      const location = String(r['ตำแหน่งที่พบบ่อย'] || '').trim();
      const cause = String(r['สาเหตุ'] || '').trim();
      const treatment = String(r['วิธีรักษาเบื้อต้น'] || '').trim();
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

const seedHerbs = async (herbs) => {
  let created = 0;
  let skipped = 0;
  for (const herb of herbs) {
    if (DRY_RUN) {
      console.log('[DRY] Herb:', herb.name);
      continue;
    }
    const form = new FormData();
    form.append('name', herb.name);
    form.append('engName', herb.scientificName);
    form.append('description', herb.description);
    form.append('properties', JSON.stringify(herb.properties || []));
    form.append('usage', herb.usage || '');
    form.append('published', String(herb.published));
    const { ok, status, data } = await fetchJson(`${API_BASE_URL}/api/herbs`, {
      method: 'POST',
      body: form
    });
    if (ok) {
      created += 1;
    } else if (status === 400) {
      skipped += 1;
    } else {
      console.warn('Herb failed:', herb.name, status, data);
    }
  }
  return { created, skipped };
};

const seedDiseases = async (diseases) => {
  let created = 0;
  let skipped = 0;
  for (const disease of diseases) {
    if (DRY_RUN) {
      console.log('[DRY] Disease:', disease.name);
      continue;
    }
    const form = new FormData();
    form.append('name', disease.name);
    form.append('description', disease.description);
    form.append('symptoms', JSON.stringify(disease.symptoms || []));
    form.append('medicines', JSON.stringify(disease.medicines || []));
    form.append('usage', disease.usage || '');
    form.append('published', String(disease.published));
    const { ok, status, data } = await fetchJson(`${API_BASE_URL}/api/diseases`, {
      method: 'POST',
      body: form
    });
    if (ok) {
      created += 1;
    } else if (status === 400) {
      skipped += 1;
    } else {
      console.warn('Disease failed:', disease.name, status, data);
    }
  }
  return { created, skipped };
};

const main = async () => {
  console.log('Seeding admin data to:', API_BASE_URL);
  const herbs = parseHerbsCsv();
  const diseases = parseDiseasesXlsx();
  console.log(`Herbs loaded: ${herbs.length}`);
  console.log(`Diseases loaded: ${diseases.length}`);

  const herbResult = await seedHerbs(herbs);
  const diseaseResult = await seedDiseases(diseases);

  console.log('Seed completed');
  console.log('Herbs created:', herbResult.created, 'skipped:', herbResult.skipped);
  console.log('Diseases created:', diseaseResult.created, 'skipped:', diseaseResult.skipped);
};

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
