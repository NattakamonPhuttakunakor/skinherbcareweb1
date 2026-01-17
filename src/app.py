from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pythainlp.tokenize import word_tokenize
from pythainlp.corpus import thai_stopwords
from pythainlp import normalize
from flasgger import Swagger
import re

app = Flask(__name__)
CORS(app)
Swagger(app)

# -----------------------------
# Enhanced Stopwords
# -----------------------------
CUSTOM_STOPWORDS = set(thai_stopwords()) | {
    "เป็น", "มี", "รู้สึก", "อาการ", "หน่อย", "มาก", "ๆ", "ค่ะ", "ครับ",
    "คือ", "ที่", "และ", "หรือ", "ช่วย", "ด้วย", "แล้ว", "จะ", "ให้", "ได้",
    "ไป", "มา", "นะ", "ค่ะ", "ครับ", "เหรอ", "อ่ะ", "อะ", "ฮะ"
}

# คำสำคัญที่ต้องการเพิ่มน้ำหนัก (Boosting Keywords)
SYMPTOM_KEYWORDS = {
    "สิว": 2.5, "แผลสิว": 2.5, "รอยสิว": 2.0, "สิวอักเสบ": 3.0,
    "คัน": 2.5, "คันมาก": 3.0, "คันๆ": 2.0,
    "แดง": 2.0, "อักเสบ": 2.5, "บวม": 2.5, "แผล": 2.5,
    "ผื่น": 2.5, "ผื่นคัน": 3.0, "ผื่นแดง": 2.5,
    "หนอง": 2.5, "เป็นหนอง": 3.0, "มีหนอง": 2.5,
    "แห้ง": 2.0, "ลอก": 2.5, "ลอกเป็นขุย": 2.5,
    "ดำ": 1.8, "จุด": 1.5, "รอย": 1.5, "หัวดำ": 2.0,
    "เหงื่อ": 1.8, "มัน": 1.8, "ผิวมัน": 2.0
}

LOCATION_KEYWORDS = {
    "หน้า": 1.5, "หน้าผาก": 2.0, "แก้ม": 2.0, "คาง": 2.0, "จมูก": 1.8,
    "หลัง": 1.8, "อก": 1.8, "แขน": 1.5, "ขา": 1.5, "มือ": 1.5, "เท้า": 1.5,
    "หูด้านใน": 2.0, "หัว": 1.8, "คอ": 1.5
}

def normalize_text(text):
    """ทำความสะอาดและ normalize ข้อความ"""
    if not text or pd.isna(text):
        return ""
    
    text = str(text)
    # Normalize Thai text (รวมสะกดที่ผิด)
    text = normalize.normalize(text)
    # ลบอักขระพิเศษ เว้นช่องว่าง
    text = re.sub(r'[^\u0E00-\u0E7Fa-zA-Z0-9\s]', ' ', text)
    # ลบช่องว่างซ้ำ
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def enhanced_thai_tokenizer(text):
    """Tokenizer ที่ปรับปรุงแล้ว พร้อม Keyword Boosting"""
    text = normalize_text(text)
    words = word_tokenize(text, engine="newmm")
    
    result = []
    for w in words:
        w = w.strip()
        # กรอง stopwords และคำที่สั้นเกินไป
        if w and w not in CUSTOM_STOPWORDS and len(w) > 1:
            # เพิ่มน้ำหนักให้คำสำคัญ (Boosting)
            if w in SYMPTOM_KEYWORDS:
                boost_count = int(SYMPTOM_KEYWORDS[w])
                result.extend([w] * boost_count)
            elif w in LOCATION_KEYWORDS:
                boost_count = int(LOCATION_KEYWORDS[w])
                result.extend([w] * boost_count)
            else:
                result.append(w)
    
    return result

# -----------------------------
# Load Data
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data.xlsx")

if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(f"ไม่พบไฟล์ data.xlsx ที่ {DATA_PATH}")

data = pd.read_excel(DATA_PATH)
data.columns = data.columns.str.strip()

def safe(val):
    return "" if pd.isna(val) else str(val)

def build_knowledge(row):
    """สร้าง Knowledge Base โดยเพิ่มน้ำหนักให้ฟิลด์สำคัญ"""
    parts = []
    
    # อาการหลัก (น้ำหนักสูงสุด - ซ้ำ 4 ครั้ง)
    main_symptom = safe(row.get('อาการหลัก'))
    parts.extend([main_symptom] * 4)
    
    # อาการรอง (น้ำหนักกลาง - ซ้ำ 2 ครั้ง)
    secondary = safe(row.get('อาการรอง'))
    parts.extend([secondary] * 2)
    
    # ตำแหน่งที่พบบ่อย (น้ำหนักกลาง - ซ้ำ 3 ครั้ง)
    location = safe(row.get('ตำแหน่งที่พบบ่อย'))
    parts.extend([location] * 3)
    
    # ชื่อโรค (น้ำหนักกลาง - ซ้ำ 2 ครั้ง)
    disease = safe(row.get('รายชื่อโรค'))
    parts.extend([disease] * 2)
    
    # วิธีรักษา (น้ำหนักต่ำ - ซ้ำ 1 ครั้ง)
    treatment = safe(row.get('วิธีรักษาเบื้อต้น'))
    parts.append(treatment)
    
    return ' '.join(parts)

data['knowledge'] = data.apply(build_knowledge, axis=1)

# -----------------------------
# Enhanced TF-IDF Model
# -----------------------------
vectorizer = TfidfVectorizer(
    tokenizer=enhanced_thai_tokenizer,
    ngram_range=(1, 3),  # เพิ่มเป็น trigram
    min_df=1,  # ลดเพื่อรองรับคำที่หายาก
    max_df=0.95,  # กรองคำที่พบบ่อยเกินไป
    sublinear_tf=True,  # ลด weight ของคำที่ซ้ำมาก
    use_idf=True,
    smooth_idf=True
)
tfidf_matrix = vectorizer.fit_transform(data['knowledge'])

# -----------------------------
# Similarity Calculation
# -----------------------------
def calculate_similarity_with_features(user_input, data_df):
    """คำนวณความคล้ายคลึงแบบ Multi-Feature"""
    
    # 1. TF-IDF Similarity (70% weight)
    user_vec = vectorizer.transform([user_input])
    tfidf_scores = cosine_similarity(user_vec, tfidf_matrix).flatten()
    
    # 2. Keyword Match Score (20% weight)
    user_tokens = set(enhanced_thai_tokenizer(user_input))
    keyword_scores = []
    
    for idx, row in data_df.iterrows():
        disease_tokens = set(enhanced_thai_tokenizer(row['knowledge']))
        # Jaccard Similarity
        intersection = len(user_tokens & disease_tokens)
        union = len(user_tokens | disease_tokens)
        keyword_score = intersection / union if union > 0 else 0
        keyword_scores.append(keyword_score)
    
    keyword_scores = np.array(keyword_scores)
    
    # 3. Location Match Bonus (10% weight)
    location_scores = np.zeros(len(data_df))
    for keyword in LOCATION_KEYWORDS.keys():
        if keyword in user_input:
            for idx, row in data_df.iterrows():
                location_field = safe(row.get('ตำแหน่งที่พบบ่อย', ''))
                if keyword in location_field:
                    location_scores[idx] += 0.3
    
    # รวมคะแนน
    final_scores = (
        tfidf_scores * 0.7 + 
        keyword_scores * 0.2 + 
        location_scores * 0.1
    )
    
    return final_scores

# -----------------------------
# Routes
# -----------------------------
@app.route("/")
def health_check():
    return jsonify({
        "status": "ok",
        "service": "SkinHerbCare Symptom AI (Enhanced)",
        "version": "2.0",
        "endpoints": {
            "diagnose": "/api/analysis/diagnose",
            "stats": "/api/analysis/stats"
        }
    })

@app.route("/api/analysis/diagnose", methods=["POST"])
def diagnose():
    """
    วิเคราะห์อาการผิวหนัง - รับอาการจริงจากผู้ใช้
    ---
    tags:
      - Diagnosis
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            symptoms:
              type: string
              description: อาการที่ผู้ใช้พิมพ์มาเอง
    responses:
      200:
        description: ผลการวิเคราะห์จากอาการที่ผู้ใช้บอกมา
    """
    payload = request.get_json(silent=True) or {}
    user_input = payload.get("symptoms", "").strip()

    if not user_input:
        return jsonify({
            "success": False, 
            "message": "กรุณากรอกอาการที่คุณรู้สึก"
        }), 400

    # Validate input length
    if len(user_input) < 3:
        return jsonify({
            "success": False,
            "message": "กรุณาระบุอาการให้ชัดเจนมากขึ้น (อย่างน้อย 3 ตัวอักษร)"
        }), 400

    # คำนวณความคล้ายคลึงแบบ Multi-Feature
    scores = calculate_similarity_with_features(user_input, data)
    
    # หา Top 3 candidates
    top_indices = np.argsort(scores)[::-1][:3]
    top_scores = scores[top_indices]
    
    # ตรวจสอบว่ามีความมั่นใจเพียงพอหรือไม่
    if top_scores[0] < 0.1:  # threshold
        return jsonify({
            "success": True,
            "data": {
                "disease": "ไม่สามารถระบุได้",
                "confidence": 0,
                "advice": "อาการที่คุณบอกมาไม่ตรงกับข้อมูลในระบบ กรุณาลองระบุอาการที่ชัดเจนยิ่งขึ้น เช่น ตำแหน่งที่เป็น ลักษณะอาการ หรือปรึกษาแพทย์ผิวหนัง",
                "herbs": [],
                "suggestions": [
                    "ลองระบุตำแหน่งที่เป็น เช่น หน้า แขน ขา",
                    "ระบุลักษณะอาการ เช่น คัน แดง บวม เป็นหนอง",
                    "บอกความรู้สึก เช่น เจ็บ แสบ ร้อน"
                ]
            }
        })
    
    # ผลลัพธ์หลัก
    main_idx = top_indices[0]
    main_row = data.iloc[main_idx]
    main_score = top_scores[0]
    
    # ผลลัพธ์รอง (ถ้า confidence ใกล้เคียงกัน)
    alternatives = []
    for i in range(1, 3):
        if top_scores[i] >= main_score * 0.75:  # ถ้าใกล้เคียงกัน
            alt_row = data.iloc[top_indices[i]]
            alternatives.append({
                "disease": safe(alt_row.get("รายชื่อโรค")),
                "confidence": round(float(top_scores[i]) * 100, 2)
            })
    
    # สร้าง response
    herbs_raw = safe(main_row.get("สมุนไพรที่เกี่ยวข้อง", ""))
    herbs_list = [h.strip() for h in herbs_raw.split(",") if h.strip()] if herbs_raw else []
    
    return jsonify({
        "success": True,
        "data": {
            "disease": safe(main_row.get("รายชื่อโรค")),
            "confidence": round(float(main_score) * 100, 2),
            "advice": safe(main_row.get("วิธีรักษาเบื้อต้น")),
            "herbs": herbs_list,
            "symptoms_matched": safe(main_row.get("อาการหลัก")),
            "common_location": safe(main_row.get("ตำแหน่งที่พบบ่อย")),
            "alternative_possibilities": alternatives if alternatives else None
        }
    })

@app.route("/api/analysis/stats", methods=["GET"])
def get_stats():
    """ดูสถิติของระบบ"""
    return jsonify({
        "total_diseases": len(data),
        "total_features": tfidf_matrix.shape[1],
        "model_info": {
            "type": "TF-IDF + Multi-Feature",
            "ngram_range": "1-3",
            "features": ["Keyword Boosting", "Location Matching", "Jaccard Similarity"]
        }
    })

# -----------------------------
# Run App
# -----------------------------
if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 Enhanced SkinHerbCare AI Server Starting...")
    print(f"📊 Loaded {len(data)} diseases")
    print(f"🎯 Model: TF-IDF + Keyword Boosting + Multi-Feature")
    print(f"🔍 Features: {tfidf_matrix.shape[1]} unique features")
    print("="*60 + "\n")
    app.run(port=5001, debug=True)