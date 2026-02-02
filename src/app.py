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
API_KEY = os.getenv("API_KEY", "123456").strip()

print("=" * 60)
print("🔑 Server API KEY:", API_KEY[:4] + "***" if len(API_KEY) >= 4 else API_KEY)
print("=" * 60)

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
    """ขยาย synonyms เพื่อเพิ่มความแม่นยำ"""
    text = str(text).lower()
    for main, syns in SYNONYM_MAP.items():
        for s in syns:
            if s in text:
                text += f" {main}"
    return text

def thai_tokenizer(text):
    """Tokenize ภาษาไทยและกรอง stopwords"""
    text = expand_synonyms(text)
    words = word_tokenize(text, engine="newmm")
    return [w for w in words if w not in CUSTOM_STOPWORDS and len(w) > 1]

# ===============================
# 📂 LOAD DATA & MODEL
# ===============================
print("🔄 Loading dataset and model...")

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

# สร้าง knowledge base
df['knowledge'] = df.apply(
    lambda r: f"{r['รายชื่อโรค']} {r['อาการหลัก']} {r['ตำแหน่งที่พบบ่อย']}",
    axis=1
)

# สร้าง TF-IDF vectorizer
vectorizer = TfidfVectorizer(tokenizer=thai_tokenizer)
tfidf_matrix = vectorizer.fit_transform(df['knowledge'])

print("✅ Dataset loaded:", len(df), "diseases")
print("✅ Model initialized successfully")

# ===============================
# 🔌 API ENDPOINTS
# ===============================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Python AI Server",
        "model": "loaded",
        "diseases_count": len(df)
    }), 200

@app.route('/predict', methods=['POST'])
@app.route('/diagnose', methods=['POST'])
def diagnose():
    """วิเคราะห์อาการและทำนายโรคผิวหนัง"""
    try:
        # 🔐 ตรวจสอบ API Key
        client_key = request.headers.get("X-API-Key") or request.headers.get("api-key")

        print("\n" + "=" * 60)
        print("📥 Incoming Request")
        print(f"🔑 Expected API Key: {API_KEY[:4]}***")
        print(f"🔑 Received API Key: {client_key[:4] + '***' if client_key and len(client_key) >= 4 else client_key}")
        
        # ตรวจสอบว่า API Key ถูกตั้งค่าหรือไม่
        if not API_KEY or API_KEY == "":
            print("❌ Server: API_KEY not configured")
            return jsonify({"message": "Server API_KEY not set"}), 500

        # ตรวจสอบว่า client ส่ง API Key มาหรือไม่
        if not client_key:
            print("❌ Client: No API Key provided")
            return jsonify({"message": "API Key required in header (X-API-Key)"}), 401

        # เปรียบเทียบ API Key
        if client_key.strip() != API_KEY.strip():
            print("❌ API Key mismatch!")
            print(f"   Expected: '{API_KEY}'")
            print(f"   Received: '{client_key}'")
            return jsonify({"message": "Invalid API Key"}), 401

        print("✅ API Key validated successfully")

        # 📩 รับและตรวจสอบ JSON body
        data = request.get_json(silent=True)
        
        if not data:
            print("❌ No JSON body received")
            return jsonify({"message": "กรุณาส่งข้อมูลเป็น JSON"}), 400

        symptoms = data.get("symptoms", "").strip()
        print(f"💬 Symptoms: '{symptoms}'")

        if not symptoms:
            print("❌ Empty symptoms field")
            return jsonify({"message": "กรุณาระบุอาการ (symptoms)"}), 400

        # 🔍 วิเคราะห์อาการ
        print("🔄 Analyzing symptoms...")
        
        user_vec = vectorizer.transform([symptoms])
        scores = cosine_similarity(user_vec, tfidf_matrix).flatten()

        idx = scores.argmax()
        score = scores[idx]

        print(f"📊 Analysis Results:")
        print(f"   Best Match Index: {idx}")
        print(f"   Confidence Score: {score:.4f} ({score * 100:.2f}%)")

        # ตรวจสอบ threshold
        if score < 0.01:
            print("⚠️ Score too low - no confident match")
            return jsonify({
                "ok": False,
                "prediction": "ไม่พบโรคที่ตรงกับอาการ",
                "confidence": 0,
                "recommendation": "กรุณาระบุอาการให้ละเอียดมากขึ้น หรือปรึกษาแพทย์ผิวหนัง"
            }), 200

        # ส่งผลลัพธ์กลับ
        row = df.iloc[idx]
        
        result = {
            "ok": True,
            "prediction": row['รายชื่อโรค'],
            "confidence": round(score * 100, 2),
            "recommendation": row['วิธีรักษาเบื้อต้น'],
            "location": row['ตำแหน่งที่พบบ่อย'],
            "symptoms_main": row['อาการหลัก']
        }

        print("✅ Analysis complete")
        print(f"   Disease: {result['prediction']}")
        print(f"   Confidence: {result['confidence']}%")
        print("=" * 60 + "\n")

        return jsonify(result), 200

    except Exception as e:
        print(f"\n💥 ERROR occurred!")
        print(f"   Type: {type(e).__name__}")
        print(f"   Message: {str(e)}")
        
        import traceback
        traceback.print_exc()
        
        return jsonify({
            "ok": False,
            "message": "เกิดข้อผิดพลาดในการวิเคราะห์",
            "error": str(e)
        }), 500

# ===============================
# 🚀 RUN SERVER
# ===============================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    
    print("\n" + "=" * 60)
    print(f"🚀 Flask AI Server Starting...")
    print(f"📍 Port: {port}")
    print(f"🔑 API Key: {API_KEY[:4]}*** (length: {len(API_KEY)})")
    print(f"📊 Diseases loaded: {len(df)}")
    print("=" * 60 + "\n")
    
    # ใช้ debug=False สำหรับ production
    app.run(host="0.0.0.0", port=port, debug=False)