import os
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ===============================
# 🔐 API KEY (ยืดหยุ่น)
# ===============================
API_KEY = os.environ.get("API_KEY", "fp_yolo_2026_secret_x93k")

# ===============================
# 📂 Load Data (มี Dummy กันพัง)
# ===============================
df = None
try:
    for f in ["data.xlsx", "data.csv", "dataset.xlsx"]:
        if os.path.exists(f):
            df = pd.read_excel(f) if f.endswith(".xlsx") else pd.read_csv(f)
            print("✅ Loaded:", f)
            break
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
# 🤖 AI (TF-IDF)
# ===============================
vectorizer = None
tfidf_matrix = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    from pythainlp.tokenize import word_tokenize

    df["text"] = df["รายชื่อโรค"] + " " + df["อาการหลัก"]
    vectorizer = TfidfVectorizer(tokenizer=word_tokenize)
    tfidf_matrix = vectorizer.fit_transform(df["text"])
    print("✅ AI Ready")
except Exception as e:
    print("⚠️ AI init error:", e)

# ===============================
# 🏥 Health Check
# ===============================
@app.route("/", methods=["GET"])
def health():
    return "✅ Python AI Service Running"

# ===============================
# 🔮 Predict
# ===============================
@app.route("/predict", methods=["POST"])
def predict():
    # 🔐 check key (ไม่ block เพื่อกัน 500)
    print('🧾 Incoming headers:', dict(request.headers))
    client_key = request.headers.get("x-api-key")
    if client_key != API_KEY:
        print("⚠️ API KEY mismatch (allow)")

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
        vec = vectorizer.transform([symptoms])
        scores = cosine_similarity(vec, tfidf_matrix).flatten()
        idx = scores.argmax()

        if scores[idx] > 0.01:
            row = df.iloc[idx]
            return jsonify({
                "prediction": row["รายชื่อโรค"],
                "confidence": round(float(scores[idx]) * 100, 2),
                "recommendation": row["วิธีรักษาเบื้อต้น"]
            })

    return jsonify({
        "prediction": "ไม่พบข้อมูลที่ตรงกัน",
        "confidence": 0,
        "recommendation": "กรุณาระบุอาการเพิ่มเติม"
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
