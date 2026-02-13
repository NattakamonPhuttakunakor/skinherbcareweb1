// Node v20+ มี fetch ให้แล้ว ไม่ต้อง import
import Disease from '../models/Disease.js';
import ProcessingDisease from '../models/ProcessingDisease.js';
import Herb from '../models/Herb.js';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const EXCEL_PATH = path.join(process.cwd(), 'src', 'data.xlsx');
let excelCache = null;

const loadExcelData = () => {
    try {
        if (excelCache) return excelCache;
        if (!fs.existsSync(EXCEL_PATH)) return null;
        const wb = xlsx.readFile(EXCEL_PATH);
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
        excelCache = rows;
        return rows;
    } catch (e) {
        return null;
    }
};

const tokenize = (text) => {
    if (!text) return [];
    const normalized = String(text).toLowerCase();
    const baseTokens = normalized
        .split(/[\s,.;:!?/\\()]+/)
        .map(t => t.trim())
        .filter(t => t.length > 1);

    // Basic Thai-friendly token fallback: create short n-grams from Thai sequences
    const thaiChunks = normalized.match(/[ก-๙]+/g) || [];
    const grams = [];
    thaiChunks.forEach((chunk) => {
        if (chunk.length < 4) return;
        for (let i = 0; i < chunk.length - 1; i += 1) {
            const bi = chunk.slice(i, i + 2);
            if (bi.length === 2) grams.push(bi);
            const tri = chunk.slice(i, i + 3);
            if (tri.length === 3) grams.push(tri);
        }
    });

    return Array.from(new Set([...baseTokens, ...grams])).filter(t => t.length > 1);
};

const buildDiseaseText = (d) => {
    const parts = [
        d.name,
        d.engName,
        d.description,
        Array.isArray(d.symptoms) ? d.symptoms.join(' ') : d.symptoms,
        d.subSymptoms,
        d.locations,
        d.cause,
        d.treatment,
        Array.isArray(d.medicines) ? d.medicines.join(' ') : d.medicines,
        d.usage
    ].filter(Boolean);
    return parts.join(' ').toLowerCase();
};

const toText = (...fields) => fields
    .filter(Boolean)
    .map(v => (Array.isArray(v) ? v.join(' ') : String(v)))
    .join(' ')
    .toLowerCase();

const normalizeHerb = (herb) => ({
    name: herb.name,
    properties: Array.isArray(herb.properties) ? herb.properties.join(', ') : (herb.properties || ''),
    image: herb.image || ''
});

const attachHerbsToResults = async (results) => {
    try {
        if (!Array.isArray(results) || results.length === 0) return results;

        const allHerbs = await Herb.find({}, { name: 1, properties: 1, image: 1 }).lean();
        if (!Array.isArray(allHerbs) || allHerbs.length === 0) return results;

        const diseaseNames = results
            .map(r => r.disease || r.name)
            .filter(Boolean);

        const diseaseDocs = diseaseNames.length > 0
            ? await Disease.find({ name: { $in: diseaseNames } }, { name: 1, usage: 1, description: 1, medicines: 1 }).lean()
            : [];
        const diseaseMap = new Map((diseaseDocs || []).map(d => [d.name, d]));

        return results.map((item) => {
            const diseaseKey = item.disease || item.name;
            const diseaseDoc = diseaseKey ? diseaseMap.get(diseaseKey) : null;
            const haystack = toText(
                item.treatment,
                item.recommendation,
                item.usage,
                item.description,
                item.herbs,
                item.name,
                item.disease,
                diseaseDoc?.usage,
                diseaseDoc?.description,
                diseaseDoc?.medicines
            );

            const relatedHerbs = allHerbs
                .filter((herb) => {
                    const herbName = String(herb.name || '').trim().toLowerCase();
                    return herbName && haystack.includes(herbName);
                })
                .map(normalizeHerb);

            return { ...item, relatedHerbs };
        });
    } catch (e) {
        return results;
    }
};

const fallbackAnalyze = async (symptomsText) => {
    try {
        const tokens = tokenize(symptomsText);
        if (tokens.length === 0) return [];

        // Use processing dataset from MongoDB (datadiseases) only.

        const diseases = await ProcessingDisease.find({}).lean();
        if (!Array.isArray(diseases) || diseases.length === 0) return [];

        const scored = diseases.map((d) => {
            const text = buildDiseaseText(d);
            let hits = 0;
            tokens.forEach((t) => {
                if (text.includes(t)) hits += 1;
            });
            const score = hits / tokens.length;
            return { d, score };
        }).filter(item => item.score > 0);

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 3).map(({ d, score }) => ({
            disease: d.name,
            confidence: Math.round(score * 100),
            main_symptoms: Array.isArray(d.symptoms) ? d.symptoms.join(', ') : (d.symptoms || ''),
            secondary_symptoms: d.subSymptoms || '',
            recommendation: d.treatment || d.usage || d.description || '',
            location: d.locations || '',
            cause: d.cause || ''
        }));
    } catch (e) {
        return [];
    }
};

export const diagnoseSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;
        // Force processing from data2 dataset in MongoDB (datadiseases) only.
        const usePython = false;

        // 1. Validate input
        if (!symptoms || typeof symptoms !== "string" || !symptoms.trim()) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุอาการ"
            });
        }

        // เพิ่มการตรวจสอบความยาวขั้นต่ำเพื่อป้องกัน 422 จาก AI Server
        if (symptoms.trim().length < 2) {
            return res.status(422).json({
                success: false,
                message: "กรุณาระบุรายละเอียดเพิ่มเติม (อย่างน้อย 2 ตัวอักษร)"
            });
        }

        // 2. วิเคราะห์จาก Excel/ฐานข้อมูลภายในก่อน (ไม่เรียก Python)
        const localResults = await fallbackAnalyze(symptoms);
        if (localResults.length > 0) {
            const enriched = await attachHerbsToResults(localResults);
            return res.json({
                success: true,
                found: true,
                data: enriched,
                message: 'วิเคราะห์จากฐานข้อมูลภายใน'
            });
        }

        if (!usePython) {
            return res.json({
                success: true,
                found: false,
                data: [],
                message: 'ไม่พบข้อมูลที่ตรงกับอาการนี้ในฐานข้อมูล'
            });
        }

        // 3. Resolve Python service URL and key (tolerant, check both API_KEY and PYTHON_API_KEY)
        let pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:5001/predict';
        // Check API_KEY first (as set on Render), fallback to PYTHON_API_KEY
        const apiKey = (process.env.API_KEY || process.env.PYTHON_API_KEY)?.trim();

        if (!process.env.PYTHON_API_URL || !apiKey) {
            const missingParts = [];
            if (!process.env.PYTHON_API_URL) missingParts.push('PYTHON_API_URL (using fallback http://127.0.0.1:5001/predict)');
            if (!apiKey) missingParts.push('API_KEY or PYTHON_API_KEY (not set — will call Python without X-API-Key if allowed)');
            console.warn('⚠️ Partial/missing Python config:', missingParts.join(', '));
        }

        console.log("📤 Node → Python:", pythonApiUrl);
        if (apiKey) console.log("🔑 PYTHON_API_KEY:", apiKey.slice(0, 4) + "***");

        // 3. Call Python API (send X-API-Key header only if configured)
        let response;
        try {
            const headers = { "Content-Type": "application/json" };
            if (apiKey) headers['X-API-Key'] = apiKey;

            response = await fetch(pythonApiUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({ symptoms: symptoms.trim() }),
                signal: AbortSignal.timeout(30000) // 30s
            });
        } catch (err) {
            console.warn('⚠️ Unable to reach Python service:', err.message);
            const fallbackResults = await fallbackAnalyze(symptoms);
            if (fallbackResults.length > 0) {
                const enriched = await attachHerbsToResults(fallbackResults);
                return res.json({
                    success: true,
                    found: true,
                    data: enriched,
                    message: 'วิเคราะห์จากฐานข้อมูลภายใน'
                });
            }
            return res.status(502).json({
                success: false,
                message: 'ไม่สามารถเชื่อมต่อบริการวิเคราะห์ (Python) ได้ในขณะนี้'
            });
        }

        // 4. Handle Python error or non-OK responses
        if (response.status === 401) {
            // If we have a configured API key, retry without it (some Python deployments don't enforce X-API-Key)
            if (apiKey) {
                console.warn('🔐 Python returned 401 with key; retrying without X-API-Key...');
                try {
                    response = await fetch(pythonApiUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ symptoms: symptoms.trim() }),
                        signal: AbortSignal.timeout(30000)
                    });
                } catch (err) {
                    console.warn('⚠️ Retry without API key failed:', err.message);
                    return res.status(502).json({
                        success: false,
                        message: 'ไม่สามารถเชื่อมต่อบริการวิเคราะห์ (Python) ได้ในขณะนี้'
                    });
                }
            } else {
                console.error('❌ Python requires API Key but server has none.');
                return res.status(500).json({ success: false, message: 'Server configuration missing: PYTHON_API_KEY. Set it in your hosting environment.' });
            }
        }

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            console.error('❌ Python returned error:', response.status, text);
            const fallbackResults = await fallbackAnalyze(symptoms);
            if (fallbackResults.length > 0) {
                const enriched = await attachHerbsToResults(fallbackResults);
                return res.json({
                    success: true,
                    found: true,
                    data: enriched,
                    message: 'วิเคราะห์จากฐานข้อมูลภายใน'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'บริการวิเคราะห์เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง'
            });
        }

        const data = await response.json().catch(() => null);
        console.log("✅ Python response:", data);

        // 5. Normalize Python response and return
        if (data && (data.prediction || data.data)) {
            // If Python returns a single prediction object
            if (data.prediction) {
                const out = {
                    disease: data.prediction,
                    confidence: data.confidence ?? 0,
                    treatment: data.recommendation || data.treatment || data.message || ''
                };
                const enriched = await attachHerbsToResults([out]);
                return res.json({ success: true, found: true, data: enriched, message: data.message || 'วิเคราะห์สำเร็จ' });
            }

            // If Python returns structured data
            const enriched = await attachHerbsToResults(data.data ?? []);
            return res.json({ success: true, found: data.found ?? false, data: enriched, message: data.message ?? 'วิเคราะห์สำเร็จ' });
        }

        return res.status(500).json({
            success: false,
            message: 'บริการวิเคราะห์ไม่สามารถประมวลผลได้'
        });

    } catch (error) {
        console.error("❌ Node Error:", error.message);

        let statusCode = 500;
        if (error.name === "AbortError") statusCode = 504;
        if (error.message.includes("Unauthorized")) statusCode = 401;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

