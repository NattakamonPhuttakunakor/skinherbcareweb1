// Node v20+ มี fetch ให้แล้ว ไม่ต้อง import
import Disease from '../models/Disease.js';
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
    return String(text)
        .toLowerCase()
        .split(/[\s,.;:!?/\\()]+/)
        .map(t => t.trim())
        .filter(t => t.length > 1);
};

const buildDiseaseText = (d) => {
    const parts = [
        d.name,
        d.engName,
        d.description,
        Array.isArray(d.symptoms) ? d.symptoms.join(' ') : d.symptoms,
        Array.isArray(d.medicines) ? d.medicines.join(' ') : d.medicines,
        d.usage
    ].filter(Boolean);
    return parts.join(' ').toLowerCase();
};

const fallbackAnalyze = async (symptomsText) => {
    try {
        const tokens = tokenize(symptomsText);
        if (tokens.length === 0) return [];

        const excelRows = loadExcelData();
        if (Array.isArray(excelRows) && excelRows.length > 0) {
            const scored = excelRows.map((row) => {
                const diseaseName = row['รายชื่อโรค'] || row['ชื่อโรค'] || row['disease'] || '';
                const main = row['อาการหลัก'] || '';
                const sub = row['อาการรอง'] || '';
                const loc = row['ตำแหน่งที่พบบ่อย'] || '';
                const cause = row['สาเหตุ'] || '';
                const treat = row['วิธีรักษาเบื้อต้น'] || '';
                const text = [diseaseName, main, sub, loc, cause, treat].filter(Boolean).join(' ').toLowerCase();
                let hits = 0;
                tokens.forEach((t) => {
                    if (text.includes(t)) hits += 1;
                });
                const score = hits / tokens.length;
                return { row, score };
            }).filter(item => item.score > 0);

            scored.sort((a, b) => b.score - a.score);
            return scored.slice(0, 3).map(({ row, score }) => ({
                disease: row['รายชื่อโรค'] || row['ชื่อโรค'] || row['disease'] || '',
                confidence: Math.round(score * 100),
                main_symptoms: row['อาการหลัก'] || '',
                secondary_symptoms: row['อาการรอง'] || '',
                recommendation: row['วิธีรักษาเบื้อต้น'] || '',
                location: row['ตำแหน่งที่พบบ่อย'] || '',
                cause: row['สาเหตุ'] || ''
            }));
        }

        const diseases = await Disease.find({}).lean();
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
            secondary_symptoms: '',
            recommendation: d.usage || d.description || '',
            location: '',
            cause: ''
        }));
    } catch (e) {
        return [];
    }
};

export const diagnoseSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;

        // 1. Validate input
        if (!symptoms || typeof symptoms !== "string" || !symptoms.trim()) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุอาการ"
            });
        }

        // เพิ่มการตรวจสอบความยาวขั้นต่ำเพื่อป้องกัน 422 จาก AI Server
        if (symptoms.trim().length < 3) {
            return res.status(422).json({
                success: false,
                message: "กรุณาระบุรายละเอียดเพิ่มเติม (อย่างน้อย 3 ตัวอักษร)"
            });
        }

        // 2. ???????????? Excel/?????????????????? (??????? Python)
        const localResults = await fallbackAnalyze(symptoms);
        if (localResults.length > 0) {
            return res.json({
                success: true,
                found: true,
                data: localResults,
                message: '??????????????????????????'
            });
        }

// 2. Resolve Python service URL and key (tolerant, check both API_KEY and PYTHON_API_KEY)
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
                return res.json({
                    success: true,
                    found: true,
                    data: fallbackResults,
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
                return res.json({
                    success: true,
                    found: true,
                    data: fallbackResults,
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
                return res.json({ success: true, found: true, data: [out], message: data.message || 'วิเคราะห์สำเร็จ' });
            }

            // If Python returns structured data
            return res.json({ success: true, found: data.found ?? false, data: data.data ?? [], message: data.message ?? 'วิเคราะห์สำเร็จ' });
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
