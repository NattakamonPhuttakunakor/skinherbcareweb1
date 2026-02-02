import os
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ===============================
# 🔐 API KEY
# ===============================
API_KEY = os.environ.get("API_KEY") or os.environ.get("PYTHON_API_KEY") or None
if not API_KEY:
    print("⚠️ Warning: API_KEY / PYTHON_API_KEY not set — running without API key enforcement")

# ===============================
# 🔧 Synonym & Tokenizer Config
# ===============================
SYNONYM_MAP = {
    'ปวด': ['เจ็บ', 'แสบ', 'บวม', 'อักเสบ', 'จุกแน่น', 'ทรมาน'],
    'คัน': ['คันๆ', 'คันมาก', 'อยากเกา', 'ยุบยิบ'],
    'ผื่น': ['ผื่นแดง', 'ผื่นคัน', 'ตุ่ม', 'ตุ่มแดง', 'ปื้น', 'ลมพิษ', 'ตุ่มใส'],
    'ไข้': ['มีไข้', 'ตัวร้อน', 'เป็นไข้', 'รุมๆ'],
    'แขน': ['ต้นแขน', 'ปลายแขน', 'ข้อศอก', 'มือ'],
    'ขา': ['ต้นขา', 'น่อง', 'เท้า', 'เข่า'],
    'มาก': ['มากๆ', 'รุนแรง', 'เยอะ', 'หนัก', 'ไม่ไหว'],
}

CUSTOM_STOPWORDS = {
    "เป็น", "มี", "รู้สึก", "อาการ", "หน่อย", "มาก", "ๆ", "ค่ะ", "ครับ",
    "คือ", "ที่", "และ", "หรือ", "ช่วย", "ด้วย", "แล้ว", "อยาก", "ต้อง",
    "นะ", "จะ", "เอง", "ได้", "ไป", "มา", "อยู่", "ให้", "บริเวณ", "แถวๆ"
}

def expand_synonyms(text):
    """ขยายคำศัพท์ (Synonym Expansion)"""
    text = str(text).lower()
    for main_word, synonyms in SYNONYM_MAP.items():
        for syn in synonyms:
            if syn in text:
                text += f" {main_word}"
    return text

def thai_tokenizer(text):
    """Tokenize Thai text"""
    if not isinstance(text, str):
        return []
    text = expand_synonyms(text)
    try:
        from pythainlp.tokenize import word_tokenize
        words = word_tokenize(text, engine="newmm", keep_whitespace=False)
    except:
        words = text.split()
    return [w for w in words if w not in CUSTOM_STOPWORDS and len(w) > 1 and not w.isnumeric()]

# ===============================
# 📂 Load & Prepare Data
# ===============================
df = None
try:
    for filename in ["data.xlsx", "data.csv", "dataset.xlsx", "data2.xlsx", "herbs_all1.csv"]:
        if os.path.exists(filename):
            try:
                if filename.endswith(".xlsx"):
                    df = pd.read_excel(filename)
                else:
                    df = pd.read_csv(filename)
                print(f"✅ Loaded: {filename}")
                break
            except Exception as inner_e:
                print(f"⚠️ Failed to parse {filename}: {inner_e}")
                continue
except Exception as e:
    print(f"⚠️ Load file error: {e}")

if df is None:
    print("⚠️ Using Dummy Data")
    df = pd.DataFrame({
        "รายชื่อโรค": ["สิวอักเสบ", "ผื่นภูมิแพ้", "ลมพิษ"],
        "อาการหลัก": ["ตุ่มแดง เจ็บ หน้ามัน", "คัน ผื่นแดง", "ตัวแดง คันมาก"],
        "อาการรอง": ["มีน้ำมันขึ้น", "ผิวระคายเคือง", "ปื้นขึ้นเฉพาะที่"],
        "วิธีรักษาเบื้อต้น": ["ล้างหน้าให้สะอาด", "ทายาแก้แพ้", "ประคบเย็น"]
    })

df.columns = df.columns.str.strip()

def clean_and_prepare_data(row):
    """Clean and prepare knowledge text for AI"""
    main = str(row.get('อาการหลัก', ''))
    sub = str(row.get('อาการรอง', '') or '')
    loc = str(row.get('ตำแหน่งที่พบบ่อย', '') or '')
    treatment = str(row.get('วิธีรักษาเบื้อต้น', '') or '')
    
    if 'ไข้' in treatment and 'ไข้' not in sub:
        sub += " มีไข้"
    
    knowledge_text = f"{row['รายชื่อโรค']} {main} {main} {sub} {loc} {loc}"
    return knowledge_text

df['knowledge'] = df.apply(clean_and_prepare_data, axis=1)

# ===============================
# 📂 Load Data (มี Dummy กันพัง)
# ===============================
df = None
try:
    # Try multiple file names (order matters — most specific first)
    for f in ["data.xlsx", "data.csv", "dataset.xlsx", "data2.xlsx", "herbs_all1.csv"]:
        if os.path.exists(f):
            try:
                if f.endswith(".xlsx"):
                    df = pd.read_excel(f)
                else:
                    df = pd.read_csv(f)
                print("✅ Loaded:", f)
                break
            except Exception as inner_e:
                print(f"⚠️ Failed to parse {f}:", inner_e)
                continue
except Exception as e:
    print("⚠️ Load file error:", e)

if df is None:
    print("⚠️ Using Dummy Data")
    df = pd.DataFrame({
        "รายชื่อโรค": ["สิวอักเสบ", "ผื่นภูมิแพ้"],
        "อาการหลัก": ["ตุ่มแดง เจ็บ หน้ามัน", "คัน ผื่นแดง"],
        "วิธีรักษาเบื้อต้น": ["ล้างหน้าให้สะอาด", "ทายาแก้แพ้"]
    })

# ===============================
# 🤖 AI (TF-IDF with improved tokenizer)
# ===============================
vectorizer = None
tfidf_matrix = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    print("🧠 Training AI model...")
    vectorizer = TfidfVectorizer(
        tokenizer=thai_tokenizer,
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True
    )
    tfidf_matrix = vectorizer.fit_transform(df['knowledge'])
    print(f"✅ AI Ready ({len(df)} diseases)")
except Exception as e:
    print(f"⚠️ AI init error: {e}")
    vectorizer = None
    tfidf_matrix = None

# ===============================
# 🏥 Health Check
# ===============================
@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "message": "Python AI Service Running",
        "ai_ready": vectorizer is not None,
        "data_loaded": df is not None,
        "api_key_configured": bool(API_KEY)
    })

@app.route("/status", methods=["GET"])
def status():
    # More detailed health info for orchestrators
    return jsonify({
        "success": True,
        "ai_ready": vectorizer is not None,
        "data_loaded": df is not None,
        "api_key_configured": bool(API_KEY)
    })

# ===============================
# 🔮 Predict
# ===============================
@app.route("/predict", methods=["POST"])
def predict():
    # 🔐 check key
    print('🧾 Incoming headers:', dict(request.headers))
    client_key = request.headers.get("x-api-key")
    # If API_KEY is configured, enforce exact match. If not configured, allow but log.
    if API_KEY:
        if not client_key:
            return jsonify({"success": False, "message": "API Key not found"}), 401
        if client_key != API_KEY:
            return jsonify({"success": False, "message": "API Key mismatch"}), 401
    else:
        print("⚠️ API key not configured on server — skipping enforcement")

    data = request.get_json(silent=True)
    if not data or "symptoms" not in data:
        return jsonify({
            "success": False,
            "message": "กรุณาระบุอาการ"
        }), 400

    symptoms = data["symptoms"].strip()
    if symptoms == "":
        return jsonify({
            "success": False,
            "message": "อาการว่างเปล่า"
        }), 400

    # วิเคราะห์
    if vectorizer and tfidf_matrix is not None:
        try:
            vec = vectorizer.transform([symptoms])
            scores = cosine_similarity(vec, tfidf_matrix).flatten()
            top_indices = scores.argsort()[::-1][:3]
            
            results = []
            for idx in top_indices:
                score = scores[idx]
                if score > 0.1:  # Confidence threshold 10%
                    row = df.iloc[idx]
                    results.append({
                        "disease": row["รายชื่อโรค"],
                        "confidence": round(float(score) * 100, 2),
                        "main_symptoms": row.get("อาการหลัก", ""),
                        "secondary_symptoms": row.get("อาการรอง", ""),
                        "recommendation": row.get("วิธีรักษาเบื้อต้น", "")
                    })
            
            if results:
                best = results[0]
                return jsonify({
                    "success": True,
                    "prediction": best["disease"],
                    "confidence": best["confidence"],
                    "recommendation": best["recommendation"],
                    "data": results,
                    "found": True
                })
            else:
                return jsonify({
                    "success": False,
                    "found": False,
                    "prediction": "ไม่พบโรคที่ตรงกับอาการนี้ชัดเจน",
                    "confidence": 0,
                    "recommendation": "กรุณาระบุรายละเอียดเพิ่มเติม"
                })
        except Exception as e:
            print(f"❌ Predict error: {e}")
            return jsonify({
                "success": False,
                "message": f"Error: {str(e)}"
            }), 500

    return jsonify({
        "success": False,
        "found": False,
        "prediction": "ไม่พบข้อมูลที่ตรงกัน",
        "confidence": 0,
        "recommendation": "กรุณาระบุอาการเพิ่มเติม"
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
