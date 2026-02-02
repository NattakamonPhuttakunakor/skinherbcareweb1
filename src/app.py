# app.py
import os
import sys
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

# พยายามโหลด Library AI ถ้าไม่มีให้ข้าม (กันบรรทัดนี้ทำพัง)
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    from pythainlp.tokenize import word_tokenize
except ImportError:
    print("⚠️ Warning: AI Libraries not found. Using dummy mode.")
    TfidfVectorizer = None

app = Flask(__name__)
CORS(app) # เปิดให้ Node.js เข้าถึงได้

# --- ส่วนโหลดข้อมูล (Load Data) ---
df = None
try:
    # ลองหาไฟล์ข้อมูลหลายๆ ชื่อ
    possible_files = ["data.xlsx", "data.csv", "dataset.xlsx"]
    for f in possible_files:
        if os.path.exists(f):
            if f.endswith('.csv'): df = pd.read_csv(f)
            else: df = pd.read_excel(f)
            print(f"✅ Loaded: {f}")
            break
except Exception as e:
    print(f"❌ Error loading file: {e}")

# ถ้าหาไฟล์ไม่เจอ หรือโหลดไม่ได้ ให้ใช้ข้อมูลจำลอง (Dummy)
if df is None:
    print("⚠️ Using Dummy Data (ข้อมูลจำลอง)")
    data = {
        'รายชื่อโรค': ['สิวอักเสบ', 'ผื่นภูมิแพ้'],
        'อาการหลัก': ['ตุ่มแดง เจ็บ หน้ามัน', 'คัน ผื่นแดง ยิบๆ'],
        'วิธีรักษาเบื้อต้น': ['ล้างหน้าให้สะอาด', 'ทายาแก้แพ้'],
        'สมุนไพรที่เกี่ยวข้อง': ['ขมิ้นชัน', 'ว่านหางจระเข้']
    }
    df = pd.DataFrame(data)

# เตรียม AI (ถ้าไลบรารีครบ)
tfidf_matrix = None
vectorizer = None
if TfidfVectorizer:
    try:
        df['all_text'] = df.apply(lambda x: f"{x.get('รายชื่อโรค','')} {x.get('อาการหลัก','')}", axis=1)
        vectorizer = TfidfVectorizer(tokenizer=word_tokenize, ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform(df['all_text'])
    except Exception as e:
        print(f"⚠️ AI Init Error: {e}")

@app.route('/', methods=['GET'])
def health_check():
    return "✅ Python AI Service is Running!"

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # 1. รับข้อมูล
        if request.is_json:
            user_input = request.json.get('symptoms', "")
        else:
            user_input = request.form.get('symptoms', "")
            
        print(f"📩 Input: {user_input}")
        
        if not user_input:
            return jsonify({"success": False, "prediction": "กรุณาระบุอาการ"})

        # 2. วิเคราะห์ (ถ้า AI พร้อม)
        best_match = None
        if vectorizer and tfidf_matrix is not None:
            user_vec = vectorizer.transform([user_input])
            scores = cosine_similarity(user_vec, tfidf_matrix).flatten()
            max_score_idx = scores.argmax()
            
            # ลดเกณฑ์ความมั่นใจลงเหลือ 0.01 เพื่อให้เจอง่ายๆ
            if scores[max_score_idx] > 0.01:
                best_match = df.iloc[max_score_idx]

        # 3. ส่งผลลัพธ์
        if best_match is not None:
            return jsonify({
                "success": True,
                "prediction": str(best_match['รายชื่อโรค']),
                "treatment": str(best_match.get('วิธีรักษาเบื้อต้น', '-')),
                "herbs": str(best_match.get('สมุนไพรที่เกี่ยวข้อง', '-')).split(',')
            })
        else:
            # ถ้า AI หาไม่เจอ ให้ตอบแบบ Default ไปก่อน (กัน Error 500)
            return jsonify({
                "success": True,
                "prediction": "ไม่พบข้อมูลที่ตรงกัน (กรุณาระบุอาการเพิ่มเติม)",
                "treatment": "-",
                "herbs": []
            })

    except Exception as e:
        print(f"❌ Server Error: {e}")
        return jsonify({"success": False, "prediction": "เกิดข้อผิดพลาดที่ระบบวิเคราะห์"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port)