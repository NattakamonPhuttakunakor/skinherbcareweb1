from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pythainlp.tokenize import word_tokenize
from pythainlp.corpus import thai_stopwords
import os

app = Flask(__name__)
CORS(app)

# ===============================
# 🔐 API KEY (PRODUCTION SAFE)
# ===============================
API_KEY = os.getenv("API_KEY")

if not API_KEY:
    raise RuntimeError("❌ API_KEY is not set in environment variables")

API_KEY = API_KEY.strip()

print("=" * 60)
print("🔑 Server API KEY:", API_KEY[:4] + "***")
print("=" * 60)

# ===============================
# 🔧 SYNONYM / STOPWORDS
# ===============================
SYNONYM_MAP = {
    'ปวด': ['เจ็บ', 'ทรมาน', 'ระบม', 'ปวดเมื่อย', 'ตึง'],
    'แสบ': ['ปวดแสบปวดร้อน', 'ร้อน', 'ไหม้', 'ระคายเคือง', 'แสบๆ'],
    'คัน': ['คันๆ', 'ยุบยิบ', 'ยิบๆ', 'อยากเกา', 'เกา'],
    'ตุ่ม': ['เม็ด', 'ผื่น', 'สิว', 'แผล', 'รอยแดง', 'ปื้น', 'จุดแดง'],
    'ผิว': ['ผิวหนัง', 'ใบหน้า', 'หน้า'],
}

CUSTOM_STOPWORDS = set(thai_stopwords()) | {
    "เป็น", "มี", "รู้สึก", "อาการ", "หน่อย", "มาก", "ๆ", "ค่ะ", "ครับ"
}

def expand_synonyms(text):
    text = str(text).lower()
    for main, syns in SYNONYM_MAP.items():
        for s in syns:
            if s in text:
                text += f" {main}"
    return text

def thai_tokenizer(text):
    text = expand_synonyms(text)
    words = word_tokenize(text, engine="newmm")
    return [w for w in words if w not in CUSTOM_STOPWORDS and len(w) > 1]

# ===============================
# 📂 DATA & MODEL
# ===============================
df = pd.DataFrame({
    'รายชื่อโรค': ['สิวอักเสบ', 'ผื่นภูมิแพ้', 'โรคผิวหนังแห้ง'],
    'อาการหลัก': ['ตุ่มแดง เจ็บ', 'คัน ผื่นแดง', 'ผิวแห้ง คัน'],
    'ตำแหน่งที่พบบ่อย': ['หน้า คาง', 'แขน ขา ลำตัว', 'ทั่วร่างกาย'],
    'วิธีรักษาเบื้อต้น': [
        'ล้างหน้าให้สะอาด หลีกเลี่ยงการบีบสิว ทายาสิว',
        'ทายาแก้แพ้ หลีกเลี่ยงสิ่งกระตุ้น',
        'ทาครีมบำรุง ดื่มน้ำให้เพียงพอ'
    ]
})

df['knowledge'] = df.apply(
    lambda r: f"{r['รายชื่อโรค']} {r['อาการหลัก']} {r['ตำแหน่งที่พบบ่อย']}",
    axis=1
)

vectorizer = TfidfVectorizer(tokenizer=thai_tokenizer)
tfidf_matrix = vectorizer.fit_transform(df['knowledge'])

print("✅ Model loaded:", len(df), "diseases")

# ===============================
# 🔌 API
# ===============================
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "Python AI",
        "diseases": len(df)
    }), 200

@app.route("/predict", methods=["POST"])
@app.route("/diagnose", methods=["POST"])
def diagnose():
    client_key = request.headers.get("X-API-Key")

    if not client_key:
        return jsonify({"message": "API Key required"}), 401

    if client_key.strip() != API_KEY:
        return jsonify({"message": "Invalid API Key"}), 401

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"message": "Invalid JSON"}), 400

    symptoms = data.get("symptoms", "").strip()
    if not symptoms:
        return jsonify({"message": "กรุณาระบุอาการ"}), 400

    user_vec = vectorizer.transform([symptoms])
    scores = cosine_similarity(user_vec, tfidf_matrix).flatten()

    idx = scores.argmax()
    score = scores[idx]

    if score < 0.01:
        return jsonify({
            "ok": False,
            "prediction": "ไม่พบโรคที่ตรง",
            "confidence": 0
        }), 200

    row = df.iloc[idx]

    return jsonify({
        "ok": True,
        "prediction": row["รายชื่อโรค"],
        "confidence": round(score * 100, 2),
        "recommendation": row["วิธีรักษาเบื้อต้น"]
    }), 200

# ===============================
# 🚀 RUN
# ===============================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    print(f"🚀 Flask running on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
