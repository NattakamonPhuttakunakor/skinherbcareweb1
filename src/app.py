from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pythainlp.tokenize import word_tokenize
from pythainlp.corpus import thai_stopwords
import sys
import os

app = Flask(__name__)
CORS(app)

# --- 1. โหลดข้อมูล (ใส่ Try/Except กันพัง) ---
df = None
try:
    # พยายามอ่านไฟล์ data.xlsx หรือ csv
    possible_files = ["data.xlsx", "data.csv"]
    for f in possible_files:
        if os.path.exists(f):
            if f.endswith('.csv'): df = pd.read_csv(f)
            else: df = pd.read_excel(f)
            print(f"✅ Loaded file: {f}")
            break
except Exception as e:
    print(f"⚠️ Error loading file: {e}")

# ถ้าหาไฟล์ไม่เจอ ใช้ข้อมูลจำลองแทน (กันระบบล่ม)
if df is None:
    print("⚠️ Using Dummy Data")
    data = {
        'รายชื่อโรค': ['สิวอักเสบ', 'ผื่นภูมิแพ้'],
        'อาการหลัก': ['ตุ่มแดง เจ็บ', 'คัน ผื่นแดง'],
        'วิธีรักษาเบื้อต้น': ['ล้างหน้าให้สะอาด', 'ทายาแก้แพ้'],
        'สมุนไพรที่เกี่ยวข้อง': ['ขมิ้นชัน', 'ว่านหางจระเข้']
    }
    df = pd.DataFrame(data)

# เตรียม AI
df.columns = df.columns.str.strip()
# สร้างคอลัมน์สำหรับค้นหา (รวมคำให้หมด)
df['search_text'] = df.apply(lambda x: f"{x.get('รายชื่อโรค','')} {x.get('อาการหลัก','')}", axis=1)

vectorizer = TfidfVectorizer(tokenizer=word_tokenize, ngram_range=(1, 2))
try:
    tfidf_matrix = vectorizer.fit_transform(df['search_text'])
except:
    print("⚠️ AI Init Failed")

# --- 2. ส่วนวิเคราะห์ (Route: /predict) ---
@app.route('/predict', methods=['POST'])
def analyze():
    # 🔥 1. ปลดล็อก API Key (ข้ามการเช็กไปก่อน เพื่อให้ชัวร์ว่าเชื่อมได้)
    # ถ้าอยากเปิดใช้ ให้ลบเครื่องหมาย # บรรทัดข้างล่างออก
    # if request.headers.get("x-api-key") != os.getenv("API_KEY", "123456"):
    #     return jsonify({"success": False, "message": "Wrong Key"}), 401

    try:
        # รับข้อมูล
        user_input = ""
        if request.is_json:
            user_input = request.json.get('symptoms', "")
        else:
            user_input = request.form.get('symptoms', "")
            
        print(f"📩 รับอาการมาว่า: {user_input}")

        if not user_input:
            return jsonify({"success": False, "prediction": "กรุณาพิมพ์อาการ"})

        # วิเคราะห์
        user_vec = vectorizer.transform([user_input])
        scores = cosine_similarity(user_vec, tfidf_matrix).flatten()
        top_idx = scores.argsort()[::-1][0] # เอาตัวที่เหมือนที่สุด 1 อันดับ
        
        # 🔥 ปรับเกณฑ์ความมั่นใจให้ต่ำลง (เพื่อให้เจอง่ายขึ้น)
        if scores[top_idx] > 0.01: 
            row = df.iloc[top_idx]
            return jsonify({
                "success": True,
                "prediction": str(row['รายชื่อโรค']),
                "confidence": float(scores[top_idx]),
                "treatment": str(row.get('วิธีรักษาเบื้อต้น', '-')),
                "herbs": str(row.get('สมุนไพรที่เกี่ยวข้อง', '-')).split(',')
            })
        else:
            return jsonify({
                "success": True, 
                "prediction": "ไม่พบข้อมูลที่ตรงกัน (ลองพิมพ์ละเอียดขึ้น)"
            })

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"success": False, "prediction": "เกิดข้อผิดพลาดที่ Server"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5001)))