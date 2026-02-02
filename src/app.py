from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pythainlp.tokenize import word_tokenize
from pythainlp.corpus import thai_stopwords
import sys
import os

app = Flask(__name__)
CORS(app)

# ===============================
# 🔐 API KEY
# ===============================
API_KEY = os.getenv("API_KEY")

# ===============================
# 🔧 SYNONYM / STOPWORDS
# ===============================
SYNONYM_MAP = {
    'ปวด': ['เจ็บ', 'ทรมาน', 'ระบม', 'ปวดเมื่อย', 'ตึง'],
    'แสบ': ['ปวดแสบปวดร้อน', 'ร้อน', 'ไหม้', 'ระคายเคือง', 'แสบๆ'],
    'คัน': ['คันๆ', 'ยุบยิบ', 'ยิบๆ', 'อยากเกา', 'เกา'],
    'ตุ่ม': ['เม็ด', 'ผื่น', 'สิว', 'แผล', 'รอยแดง', 'ปื้น', 'จุดแดง'],
    'ปาก': ['ริมฝีปาก', 'มุมปาก', 'รอบปาก', 'หน้า'],
    'ไข้': ['ตัวร้อน', 'รุมๆ', 'ครั่นเนื้อครั่นตัว', 'มีไข้', 'เป็นไข้'],
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
# 📂 LOAD DATA
# ===============================
df = pd.DataFrame({
    'รายชื่อโรค': ['สิวอักเสบ', 'ผื่นภูมิแพ้'],
    'อาการหลัก': ['ตุ่มแดง เจ็บ', 'คัน ผื่นแดง'],
    'ตำแหน่งที่พบบ่อย': ['หน้า', 'แขน ขา'],
    'วิธีรักษาเบื้อต้น': ['ล้างหน้าให้สะอาด', 'ทายาแก้แพ้']
})

df['knowledge'] = df.apply(
    lambda r: f"{r['รายชื่อโรค']} {r['อาการหลัก']} {r['ตำแหน่งที่พบบ่อย']}",
    axis=1
)

vectorizer = TfidfVectorizer(tokenizer=thai_tokenizer)
tfidf_matrix = vectorizer.fit_transform(df['knowledge'])

# ===============================
# 🔌 API
# ===============================
@app.route('/diagnose', methods=['POST'])
def diagnose():
    # 🔐 CHECK API KEY
    client_key = request.headers.get("X-API-Key")

    print("🔑 ENV API KEY:", API_KEY[:4] + "***" if API_KEY else None)
    print("📥 CLIENT KEY:", client_key[:4] + "***" if client_key else None)

    if not API_KEY:
        return jsonify({"message": "Server API_KEY not set"}), 500

    if not client_key or client_key.strip() != API_KEY.strip():
        return jsonify({"message": "Invalid API Key"}), 401

    # 📩 รับ JSON
    data = request.get_json(silent=True)
    symptoms = data.get("symptoms", "").strip() if data else ""

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
        "prediction": row['รายชื่อโรค'],
        "confidence": round(score * 100, 2),
        "recommendation": row['วิธีรักษาเบื้อต้น']
    })

if __name__ == "__main__":
    print("🚀 Flask API running on port 5001")
    app.run(host="0.0.0.0", port=5001, debug=True)
