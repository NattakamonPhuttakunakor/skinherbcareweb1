from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pythainlp.tokenize import word_tokenize
from pythainlp.corpus import thai_stopwords
import os

app = Flask(__name__)

# ✅ CORS (รองรับ preflight)
CORS(app, resources={r"/*": {"origins": "*"}})

# ===============================
# 🔐 API KEY
# ===============================
API_KEY = os.getenv("API_KEY")

print("🔐 SERVER API_KEY:", API_KEY[:4] + "***" if API_KEY else "❌ NOT SET")

# ===============================
# 🔧 NLP CONFIG
# ===============================
SYNONYM_MAP = {
    'ปวด': ['เจ็บ', 'ทรมาน', 'ระบม', 'ปวดเมื่อย', 'ตึง'],
    'แสบ': ['ปวดแสบปวดร้อน', 'ร้อน', 'ไหม้', 'ระคายเคือง'],
    'คัน': ['ยุบยิบ', 'อยากเกา'],
    'ตุ่ม': ['เม็ด', 'ผื่น', 'สิว', 'แผล', 'รอยแดง'],
    'ผิว': ['ผิวหนัง', 'หน้า']
}

CUSTOM_STOPWORDS = set(thai_stopwords()) | {
    "เป็น", "มี", "อาการ", "มาก", "ค่ะ", "ครับ"
}

def expand_synonyms(text):
    text = str(text).lower()
    for k, syns in SYNONYM_MAP.items():
        if any(s in text for s in syns):
            text += f" {k}"
    return text

def thai_tokenizer(text):
    words = word_tokenize(expand_synonyms(text), engine="newmm")
    return [w for w in words if w not in CUSTOM_STOPWORDS and len(w) > 1]

# ===============================
# 📂 DATA
# ===============================
df = pd.DataFrame({
    'disease': ['สิวอักเสบ', 'ผื่นภูมิแพ้'],
    'symptoms': ['ตุ่มแดง เจ็บ', 'คัน ผื่นแดง'],
    'location': ['หน้า', 'แขน ขา'],
    'treatment': ['ล้างหน้าให้สะอาด', 'ทายาแก้แพ้']
})

df['knowledge'] = df.apply(
    lambda r: f"{r['disease']} {r['symptoms']} {r['location']}",
    axis=1
)

vectorizer = TfidfVectorizer(tokenizer=thai_tokenizer)
tfidf_matrix = vectorizer.fit_transform(df['knowledge'])

# ===============================
# 🔌 API
# ===============================
@app.route("/diagnose", methods=["POST", "OPTIONS"])
def diagnose():
    if request.method == "OPTIONS":
        return "", 200

    client_key = request.headers.get("X-API-Key")

    print("📥 CLIENT KEY:", client_key[:4] + "***" if client_key else None)

    if not API_KEY:
        return jsonify({"message": "Server API_KEY not set"}), 500

    if not client_key or client_key.strip() != API_KEY.strip():
        return jsonify({"message": "Invalid API Key"}), 401

    data = request.get_json(silent=True) or {}
    symptoms = data.get("symptoms", "").strip()

    if not symptoms:
        return jsonify({"message": "กรุณาระบุอาการ"}), 400

    user_vec = vectorizer.transform([symptoms])
    scores = cosine_similarity(user_vec, tfidf_matrix).flatten()

    idx = scores.argmax()
    score = scores[idx]

    if score < 0.01:
        return jsonify({
            "prediction": "ไม่พบโรคที่ตรง",
            "confidence": 0
        })

    row = df.iloc[idx]

    return jsonify({
        "prediction": row["disease"],
        "confidence": round(score * 100, 2),
        "recommendation": row["treatment"]
    })

# ===============================
# 🚀 START SERVER
# ===============================
if __name__ == "__main__":
    print("🚀 Flask API running on port 5001")
    app.run(host="0.0.0.0", port=5001)
