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

# เริ่มต้น Server
app = Flask(__name__)
CORS(app) # อนุญาตให้ Node.js เข้ามาคุยได้

# ========================================
# 🔧 ส่วนที่ 1: ตั้งค่า Synonym (เพิ่มคำศัพท์ให้ AI เข้าใจภาษาคนมากขึ้น)
# ========================================
SYNONYM_MAP = {
    'ปวด': ['เจ็บ', 'แสบ', 'บวม', 'อักเสบ', 'จุกแน่น', 'ทรมาน', 'ปวดแสบ', 'ร้อน'],
    'คัน': ['คันๆ', 'คันมาก', 'อยากเกา', 'ยุบยิบ', 'ยิบๆ'],
    'ผื่น': ['ผื่นแดง', 'ผื่นคัน', 'ตุ่ม', 'ตุ่มแดง', 'ปื้น', 'ลมพิษ', 'ตุ่มใส', 'เม็ด'],
    'ไข้': ['มีไข้', 'ตัวร้อน', 'เป็นไข้', 'รุมๆ', 'ครั่นเนื้อครั่นตัว'],
    'ปาก': ['ริมฝีปาก', 'มุมปาก', 'หน้า', 'แก้ม'],
    'แขน': ['ต้นแขน', 'ปลายแขน', 'ข้อศอก', 'มือ', 'นิ้ว'],
    'ขา': ['ต้นขา', 'น่อง', 'เท้า', 'เข่า'],
    'มาก': ['มากๆ', 'รุนแรง', 'เยอะ', 'หนัก', 'ไม่ไหว'],
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
# 📂 ส่วนที่ 2: โหลดข้อมูล
# ========================================
print("⏳ กำลังโหลดข้อมูลและเทรน AI...")
df = None
possible_files = ["data.xlsx - Sheet1.csv", "data.csv", "data.xlsx"]

for f in possible_files:
    if os.path.exists(f):
        try:
            if f.endswith('.csv'):
                df = pd.read_csv(f)
            else:
                df = pd.read_excel(f)
            print(f"✅ เจอไฟล์: {f}")
            break
        except Exception as e:
            print(f"⚠️ อ่านไฟล์ {f} ไม่ได้: {e}")

if df is None:
    print("❌ Error: หาไฟล์ข้อมูลไม่เจอเลย")
    sys.exit()

df.columns = df.columns.str.strip()

def clean_and_prepare_data(row):
    main = str(row.get('อาการหลัก', ''))
    sub = str(row.get('อาการรอง', ''))
    loc = str(row.get('ตำแหน่งที่พบบ่อย', ''))
    treatment = str(row.get('วิธีรักษาเบื้อต้น', ''))
    
    if 'ไข้' in treatment and 'ไข้' not in sub:
        sub += " มีไข้"
        
    # เบิ้ลคำเพื่อเพิ่มน้ำหนัก (Weighting)
    knowledge_text = f"{row['รายชื่อโรค']} {main} {main} {sub} {loc} {loc}"
    return knowledge_text

df['knowledge'] = df.apply(lambda x: clean_and_prepare_data(x), axis=1)

vectorizer = TfidfVectorizer(
    tokenizer=thai_tokenizer,
    ngram_range=(1, 2),
    min_df=1,
    sublinear_tf=True
)

try:
    tfidf_matrix = vectorizer.fit_transform(df['knowledge'])
    print(f"✅ AI พร้อมทำงาน! (รู้จัก {len(df)} โรค)")
except Exception as e:
    print(f"❌ Error ตอนสร้างสมอง AI: {e}")
    sys.exit()

# ========================================
# 🔌 ส่วนที่ 3: API Endpoint
# ========================================
@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.json
    user_input = data.get('symptoms', '').strip()
    
    print(f"📩 Input: {user_input}") # Log input

    if not user_input:
        return jsonify({"success": False, "message": "กรุณาระบุอาการ"})

    user_vec = vectorizer.transform([user_input])
    scores = cosine_similarity(user_vec, tfidf_matrix).flatten()
    
    # หา Top 3
    top_indices = scores.argsort()[::-1][:3]
    
    results = []
    found_any = False

    for idx in top_indices:
        score = scores[idx]
        
        # 🚩🚩🚩 แก้ตรงนี้: ลดเกณฑ์จาก 0.1 เหลือ 0.01 🚩🚩🚩
        # ช่วยให้เจอข้อมูลง่ายขึ้น แม้คำจะไม่ตรงเป๊ะ
        if score > 0.01: 
            found_any = True
            row = df.iloc[idx]
            
            # Debug: ปริ้นท์คะแนนดูว่าได้เท่าไหร่
            print(f"   👉 เจอโรค: {row['รายชื่อโรค']} (Score: {score:.4f})")

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
        print("   ❌ ไม่พบข้อมูลที่คะแนนสูงพอ")
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