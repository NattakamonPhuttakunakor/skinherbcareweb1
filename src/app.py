import os
import io
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    from ultralytics import YOLO
    from PIL import Image
    YOLO_AVAILABLE = True
except Exception as e:
    YOLO_AVAILABLE = False
    YOLO_IMPORT_ERROR = str(e)

app = Flask(__name__)
CORS(app)

# ===============================
# Base Directory
# ===============================
base_dir = os.path.dirname(__file__)

# ===============================
# YOLO Model (Image)
# ===============================
yolo_model = None
YOLO_MODEL_PATH = os.environ.get("YOLO_MODEL_PATH") or os.path.join(base_dir, "best.pt")
if YOLO_AVAILABLE:
    try:
        yolo_model = YOLO(YOLO_MODEL_PATH)
        print(f"YOLO model loaded: {YOLO_MODEL_PATH}")
    except Exception as e:
        print(f"YOLO model load failed: {e}")
else:
    print(f"YOLO not available: {YOLO_IMPORT_ERROR}")

# ===============================
# API KEY
# ===============================
API_KEY = os.environ.get("API_KEY") or os.environ.get("PYTHON_API_KEY") or None
if not API_KEY:
    print("Warning: API_KEY / PYTHON_API_KEY not set - running without API key enforcement")

# ===============================
# Synonym & Tokenizer Config
# ===============================
SYNONYM_MAP = {
    "\u0e1b\u0e27\u0e14": ["\u0e40\u0e08\u0e47\u0e1a", "\u0e41\u0e2a\u0e1a", "\u0e1a\u0e27\u0e21", "\u0e2d\u0e31\u0e01\u0e40\u0e2a\u0e1a", "\u0e08\u0e38\u0e01\u0e41\u0e19\u0e48\u0e19", "\u0e17\u0e23\u0e21\u0e32\u0e19"],
    "\u0e04\u0e31\u0e19": ["\u0e04\u0e31\u0e19\u0e46", "\u0e04\u0e31\u0e19\u0e21\u0e32\u0e01", "\u0e2d\u0e22\u0e32\u0e01\u0e40\u0e01\u0e32", "\u0e22\u0e38\u0e1a\u0e22\u0e34\u0e1a"],
    "\u0e1c\u0e37\u0e48\u0e19": ["\u0e1c\u0e37\u0e48\u0e19\u0e41\u0e14\u0e07", "\u0e1c\u0e37\u0e48\u0e19\u0e04\u0e31\u0e19", "\u0e15\u0e38\u0e48\u0e21", "\u0e15\u0e38\u0e48\u0e21\u0e41\u0e14\u0e07", "\u0e1b\u0e37\u0e49\u0e19", "\u0e25\u0e21\u0e1e\u0e34\u0e29", "\u0e15\u0e38\u0e48\u0e21\u0e43\u0e2a"],
    "\u0e44\u0e02\u0e49": ["\u0e21\u0e35\u0e44\u0e02\u0e49", "\u0e15\u0e31\u0e27\u0e23\u0e49\u0e2d\u0e19", "\u0e40\u0e1b\u0e47\u0e19\u0e44\u0e02\u0e49", "\u0e23\u0e38\u0e21\u0e46"],
    "\u0e41\u0e02\u0e19": ["\u0e15\u0e49\u0e19\u0e41\u0e02\u0e19", "\u0e1b\u0e25\u0e32\u0e22\u0e41\u0e02\u0e19", "\u0e02\u0e49\u0e2d\u0e28\u0e2d\u0e01", "\u0e21\u0e37\u0e2d"],
    "\u0e02\u0e32": ["\u0e15\u0e49\u0e19\u0e02\u0e32", "\u0e19\u0e48\u0e2d\u0e07", "\u0e40\u0e17\u0e49\u0e32", "\u0e40\u0e02\u0e48\u0e32"],
    "\u0e21\u0e32\u0e01": ["\u0e21\u0e32\u0e01\u0e46", "\u0e23\u0e38\u0e19\u0e41\u0e23\u0e07", "\u0e40\u0e22\u0e2d\u0e30", "\u0e2b\u0e19\u0e31\u0e01", "\u0e44\u0e21\u0e48\u0e44\u0e2b\u0e27"],
}

try:
    from pythainlp.corpus import thai_stopwords
    BASE_STOPWORDS = set(thai_stopwords())
except Exception:
    BASE_STOPWORDS = set()

CUSTOM_STOPWORDS = BASE_STOPWORDS | {
    "\u0e40\u0e1b\u0e47\u0e19", "\u0e21\u0e35", "\u0e23\u0e39\u0e49\u0e2a\u0e36\u0e01", "\u0e2d\u0e32\u0e01\u0e32\u0e23", "\u0e2b\u0e19\u0e48\u0e2d\u0e22", "\u0e21\u0e32\u0e01", "\u0e46", "\u0e04\u0e48\u0e30", "\u0e04\u0e23\u0e31\u0e1a",
    "\u0e04\u0e37\u0e2d", "\u0e17\u0e35\u0e48", "\u0e41\u0e25\u0e30", "\u0e2b\u0e23\u0e37\u0e2d", "\u0e0a\u0e48\u0e27\u0e22", "\u0e14\u0e49\u0e27\u0e22", "\u0e41\u0e25\u0e49\u0e27", "\u0e2d\u0e22\u0e32\u0e01", "\u0e15\u0e49\u0e2d\u0e07",
    "\u0e19\u0e30", "\u0e08\u0e30", "\u0e40\u0e2d\u0e07", "\u0e44\u0e14\u0e49", "\u0e44\u0e1b", "\u0e21\u0e32", "\u0e2d\u0e22\u0e39\u0e48", "\u0e43\u0e2b\u0e49", "\u0e1a\u0e23\u0e34\u0e40\u0e27\u0e13", "\u0e41\u0e16\u0e27\u0e46"
}

COL_DISEASE = "\u0e23\u0e32\u0e22\u0e0a\u0e37\u0e48\u0e2d\u0e42\u0e23\u0e04"
COL_MAIN = "\u0e2d\u0e32\u0e01\u0e32\u0e23\u0e2b\u0e25\u0e31\u0e01"
COL_SUB = "\u0e2d\u0e32\u0e01\u0e32\u0e23\u0e23\u0e2d\u0e07"
COL_LOC = "\u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07\u0e17\u0e35\u0e48\u0e1e\u0e1a\u0e1a\u0e48\u0e2d\u0e22"
COL_CAUSE = "\u0e2a\u0e32\u0e40\u0e2b\u0e15\u0e38"
COL_TREAT = "\u0e27\u0e34\u0e18\u0e35\u0e23\u0e31\u0e01\u0e29\u0e32\u0e40\u0e1a\u0e37\u0e49\u0e2d\u0e15\u0e49\u0e19"


def expand_synonyms(text):
    text = str(text).lower()
    for main_word, synonyms in SYNONYM_MAP.items():
        for syn in synonyms:
            if syn in text:
                text += f" {main_word}"
    return text


def thai_tokenizer(text):
    if not isinstance(text, str):
        return []
    text = expand_synonyms(text)
    try:
        from pythainlp.tokenize import word_tokenize
        words = word_tokenize(text, engine="newmm", keep_whitespace=False)
    except Exception:
        words = text.split()
    return [w for w in words if w not in CUSTOM_STOPWORDS and len(w) > 1 and not w.isnumeric()]

# ===============================
# Load & Prepare Data
# ===============================

df = None

candidate_files = [
    os.path.join(base_dir, "data.xlsx"),
    os.path.join(base_dir, "data.csv"),
    os.path.join(base_dir, "dataset.xlsx"),
    os.path.join(base_dir, "data2.xlsx"),
    "data.xlsx",
    "data.csv",
    "dataset.xlsx",
    "data2.xlsx",
]

for filename in candidate_files:
    if os.path.exists(filename):
        try:
            if filename.endswith(".xlsx"):
                df = pd.read_excel(filename)
            else:
                df = pd.read_csv(filename)
            print(f"Loaded dataset: {filename}")
            break
        except Exception as inner_e:
            print(f"Failed to parse {filename}: {inner_e}")

if df is None:
    print("Using dummy data (dataset not found)")
    df = pd.DataFrame({
        COL_DISEASE: ["\u0e2a\u0e34\u0e27\u0e2d\u0e31\u0e01\u0e40\u0e2a\u0e1a", "\u0e1c\u0e37\u0e48\u0e19\u0e20\u0e39\u0e21\u0e34\u0e41\u0e1e\u0e49", "\u0e25\u0e21\u0e1e\u0e34\u0e29"],
        COL_MAIN: ["\u0e15\u0e38\u0e48\u0e21\u0e41\u0e14\u0e07 \u0e40\u0e08\u0e47\u0e1a \u0e2b\u0e19\u0e49\u0e32\u0e21\u0e31\u0e19", "\u0e04\u0e31\u0e19 \u0e1c\u0e37\u0e48\u0e19\u0e41\u0e14\u0e07", "\u0e15\u0e31\u0e27\u0e41\u0e14\u0e07 \u0e04\u0e31\u0e19\u0e21\u0e32\u0e01"],
        COL_SUB: ["\u0e21\u0e35\u0e19\u0e49\u0e33\u0e21\u0e31\u0e19\u0e02\u0e36\u0e49\u0e19", "\u0e1c\u0e34\u0e27\u0e23\u0e30\u0e04\u0e32\u0e22\u0e40\u0e04\u0e37\u0e2d\u0e07", "\u0e1b\u0e37\u0e49\u0e19\u0e02\u0e36\u0e49\u0e19\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e17\u0e35\u0e48"],
        COL_LOC: ["", "", ""],
        COL_CAUSE: ["", "", ""],
        COL_TREAT: ["\u0e25\u0e49\u0e32\u0e07\u0e2b\u0e19\u0e49\u0e32\u0e43\u0e2b\u0e49\u0e2a\u0e30\u0e2d\u0e32\u0e14", "\u0e17\u0e32\u0e22\u0e32\u0e41\u0e01\u0e49\u0e41\u0e1e\u0e49", "\u0e1b\u0e23\u0e30\u0e04\u0e1a\u0e40\u0e22\u0e47\u0e19"],
    })

df.columns = df.columns.str.strip()


def clean_and_prepare_data(row):
    main = str(row.get(COL_MAIN, "") or "")
    sub = str(row.get(COL_SUB, "") or "")
    loc = str(row.get(COL_LOC, "") or "")
    treat = str(row.get(COL_TREAT, "") or "")
    disease = str(row.get(COL_DISEASE, "") or "")

    # Patch: move "ไข้" from treatment into symptoms if missing
    if "ไข้" in treat and "ไข้" not in sub:
        sub = (sub + " มีไข้").strip()

    # Weight main + location
    knowledge_text = f"{disease} {main} {main} {sub} {loc} {loc}".strip()
    return knowledge_text


vectorizer = None
tfidf_matrix = None

try:
    if df is not None and len(df) > 0:
        df["knowledge"] = df.apply(clean_and_prepare_data, axis=1)
        vectorizer = TfidfVectorizer(
            tokenizer=thai_tokenizer,
            ngram_range=(1, 2),
            min_df=1,
            sublinear_tf=True,
        )
        tfidf_matrix = vectorizer.fit_transform(df["knowledge"])
        print(f"AI ready. Diseases: {len(df)}")
except Exception as e:
    print(f"Vectorizer init failed: {e}")


def health():
    return jsonify({
        "success": True,
        "message": "Python AI Service Running",
        "ai_ready": vectorizer is not None,
        "data_loaded": df is not None,
        "api_key_configured": bool(API_KEY),
    })


@app.route("/status", methods=["GET"])
def status():
    return jsonify({
        "success": True,
        "ai_ready": vectorizer is not None,
        "data_loaded": df is not None,
        "api_key_configured": bool(API_KEY),
    })


@app.route("/predict", methods=["POST"])
def predict():
    client_key = request.headers.get("x-api-key")
    if API_KEY:
        if not client_key:
            return jsonify({"success": False, "message": "API Key not found"}), 401
        if client_key != API_KEY:
            return jsonify({"success": False, "message": "API Key mismatch"}), 401

    # ---------------------------
    # Image path (YOLO)
    # ---------------------------
    if "file" in request.files:
        if yolo_model is None:
            return jsonify({
                "success": False,
                "message": "YOLO model not loaded on server"
            }), 500

        file = request.files["file"]
        if not file or file.filename == "":
            return jsonify({"success": False, "message": "Empty file"}), 400

        try:
            img_bytes = file.read()
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            results = yolo_model(img)

            predictions = []
            top_prediction = {"class_name": "Unknown", "confidence": 0.0}

            for r in results:
                for box in getattr(r, "boxes", []):
                    conf = float(box.conf[0]) if hasattr(box, "conf") else 0.0
                    cls = int(box.cls[0]) if hasattr(box, "cls") else -1
                    class_name = yolo_model.names.get(cls, "Unknown") if hasattr(yolo_model, "names") else "Unknown"
                    box_xyxy = box.xyxy[0].tolist() if hasattr(box, "xyxy") else []

                    predictions.append({
                        "class_name": class_name,
                        "confidence": round(conf, 4),
                        "box": box_xyxy
                    })

                    if conf > top_prediction["confidence"]:
                        top_prediction = {
                            "class_name": class_name,
                            "confidence": round(conf, 4)
                        }

            return jsonify({
                "success": True,
                "type": "image",
                "top_prediction": top_prediction["class_name"],
                "confidence": top_prediction["confidence"],
                "detections": predictions
            })
        except Exception as e:
            print(f"YOLO error: {e}")
            return jsonify({"success": False, "message": f"Image processing failed: {str(e)}"}), 500

    data = request.get_json(silent=True)
    if not data or "symptoms" not in data:
        return jsonify({
            "success": False,
            "message": "\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e2d\u0e32\u0e01\u0e32\u0e23",
        }), 400

    symptoms = str(data.get("symptoms", "")).strip()
    if symptoms == "":
        return jsonify({
            "success": False,
            "message": "\u0e2d\u0e32\u0e01\u0e32\u0e23\u0e27\u0e48\u0e32\u0e07\u0e40\u0e1b\u0e25\u0e48\u0e32",
        }), 400

    if vectorizer is not None and tfidf_matrix is not None:
        try:
            vec = vectorizer.transform([symptoms])
            scores = cosine_similarity(vec, tfidf_matrix).flatten()
            top_indices = scores.argsort()[::-1][:3]

            results = []
            for idx in top_indices:
                score = scores[idx]
                if score > 0.1:
                    row = df.iloc[idx]
                    results.append({
                        "disease": row.get(COL_DISEASE, ""),
                        "confidence": round(float(score) * 100, 2),
                        "main_symptoms": row.get(COL_MAIN, ""),
                        "secondary_symptoms": row.get(COL_SUB, ""),
                        "recommendation": row.get(COL_TREAT, ""),
                        "location": row.get(COL_LOC, ""),
                        "cause": row.get(COL_CAUSE, ""),
                    })

            if results:
                best = results[0]
                return jsonify({
                    "success": True,
                    "prediction": best["disease"],
                    "confidence": best["confidence"],
                    "recommendation": best["recommendation"],
                    "data": results,
                    "found": True,
                })

            return jsonify({
                "success": False,
                "found": False,
                "prediction": "\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e42\u0e23\u0e04\u0e17\u0e35\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a\u0e2d\u0e32\u0e01\u0e32\u0e23\u0e19\u0e35\u0e49\u0e0a\u0e31\u0e14\u0e40\u0e08\u0e19",
                "confidence": 0,
                "recommendation": "\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21",
            })
        except Exception as e:
            print(f"Predict error: {e}")
            return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

    return jsonify({
        "success": False,
        "found": False,
        "prediction": "\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e17\u0e35\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19",
        "confidence": 0,
        "recommendation": "\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e2d\u0e32\u0e01\u0e32\u0e23\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21",
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
