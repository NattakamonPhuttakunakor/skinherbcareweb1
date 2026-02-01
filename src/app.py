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

# ========================================
# 🔧 ส่วนที่ 1: ปรับจูนคำศัพท์ (Synonyms)
# ========================================
# ยิ่งใส่เยอะ AI ยิ่งฉลาด เข้าใจภาษาชาวบ้านได้ดีขึ้น
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
    "เป็น", "มี", "รู้สึก", "อาการ", "หน่อย", "มาก", "ๆ", "ค่ะ", "ครับ", 
    "คือ", "ที่", "และ", "หรือ", "ช่วย", "ด้วย", "แล้ว", "อยาก", "ต้อง",
    "นะ", "จะ", "เอง", "ได้", "ไป", "มา", "อยู่", "ให้", "บริเวณ", "แถวๆ", "มัน"
}

def expand_synonyms(text):
    text = str(text).lower()
    for main_word, synonyms in SYNONYM_MAP.items():
        for syn in synonyms:
            if syn in text:
                text += f" {main_word}" 
    return text

def thai_tokenizer(text):
    if not isinstance(text, str): return []
    text = expand_synonyms(text) 
    words = word_tokenize(text, engine="newmm", keep_whitespace=False)
    return [w for w in words if w not in CUSTOM_STOPWORDS and len(w) > 1 and not w.isnumeric()]

# ========================================
# 📂 ส่วนที่ 2: โหลดข้อมูล (Excel/CSV)
# ========================================
print("⏳ AI: กำลังโหลดข้อมูล...")
df = None
possible_files = ["data.xlsx - Sheet1.csv", "data.csv", "data.xlsx"]

for f in possible_files:
    if os.path.exists(f):
        try:
            if f.endswith('.csv'):
                df = pd.read_csv(f)
            else:
                df = pd.read_excel(f)
            print(f"✅ AI: เจอไฟล์ {f}")
            break
        except Exception as e:
            print(f"⚠️ AI: อ่านไฟล์ {f} ไม่ได้ ({e})")

if df is None:
    print("❌ Error: ไม่พบไฟล์ข้อมูล (data.xlsx หรือ .csv)")
    sys.exit()

df.columns = df.columns.str.strip()

# เตรียมข้อมูลสำหรับเทรน (รวมคอลัมน์สำคัญเข้าด้วยกัน)
def clean_and_prepare_data(row):
    main = str(row.get('อาการหลัก', ''))
    sub = str(row.get('อาการรอง', ''))
    loc = str(row.get('ตำแหน่งที่พบบ่อย', ''))
    
    # เทคนิค: เบิ้ลคำสำคัญเพื่อให้ AI ให้ความสำคัญมากขึ้น
    knowledge_text = f"{row['รายชื่อโรค']} {main} {main} {sub} {loc}"
    return knowledge_text

df['knowledge'] = df.apply(lambda x: clean_and_prepare_data(x), axis=1)

# สร้างสมอง AI
vectorizer = TfidfVectorizer(
    tokenizer=thai_tokenizer,
    ngram_range=(1, 2),
    min_df=1,
    sublinear_tf=True
)

try:
    tfidf_matrix = vectorizer.fit_transform(df['knowledge'])
    print(f"✅ AI: พร้อมทำงาน! (รู้จัก {len(df)} โรค)")
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit()

# ========================================
# 🔌 ส่วนที่ 3: API Endpoint
# ========================================
@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.json
    user_input = data.get('symptoms', '').strip()
    
    print(f"\n📩 ได้รับข้อความ: '{user_input}'")

    if not user_input:
        return jsonify({"success": False, "message": "กรุณาระบุอาการ"})

    user_vec = vectorizer.transform([user_input])
    scores = cosine_similarity(user_vec, tfidf_matrix).flatten()
    
    # เรียงลำดับคะแนนจากมากไปน้อย
    top_indices = scores.argsort()[::-1][:3]
    
    results = []
    found_any = False

    for idx in top_indices:
        score = scores[idx]
        
        # 🔥 จุดสำคัญ: ลดเกณฑ์ลงเหลือ 0.01 (1%) 
        # เพราะภาษาคนกับภาษาหมอไม่เหมือนกัน คะแนนมักจะน้อย
        if score > 0.01: 
            found_any = True
            row = df.iloc[idx]
            
            print(f"   👉 ตรงกับ: {row['รายชื่อโรค']} (ความมั่นใจ: {score:.4f})")

            warning_msg = ""
            if 'ไข้' in user_input and 'ไข้' in str(row.get('อาการรอง', '')):
                warning_msg = "(โรคนี้มักมีไข้ร่วมด้วย ตรงกับอาการของคุณ)"

            results.append({
                "disease": str(row['รายชื่อโรค']),
                "confidence": round(score * 100, 2),
                "symptoms": str(row['อาการหลัก']),
                "location": str(row['ตำแหน่งที่พบบ่อย']),
                "treatment": str(row.get('วิธีรักษาเบื้อต้น', 'แนะนำให้พบแพทย์')),
                "warning": warning_msg,
                "herbs": str(row.get('สมุนไพรที่เกี่ยวข้อง', '-')).split(',')
            })

    if not found_any:
        print("   ❌ ผลลัพธ์: ไม่พบข้อมูลที่ตรงกัน (คะแนนต่ำเกินไป)")
        return jsonify({
            "success": True,
            "found": False,
            "message": "ไม่พบโรคที่ตรงกับอาการชัดเจน"
        })

    return jsonify({
        "success": True,
        "found": True,
        "data": results
    })

if __name__ == '__main__':
    print("🚀 Python Server รันที่ Port 5001...")
    app.run(port=5001, debug=True)