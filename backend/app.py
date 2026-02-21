#!/usr/bin/env python3
"""
ExoScope ML Backend — Flask API
Task A: Classification (CONFIRMED vs FALSE POSITIVE)
Task B: Regression (Planet Radius prediction)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle, numpy as np, sqlite3, datetime, json, os, traceback, time

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Load Models ───────────────────────────────────────────────────────────────
with open(os.path.join(BASE_DIR, "clf_pipeline.pkl"), "rb") as f:
    CLF_MODEL = pickle.load(f)

with open(os.path.join(BASE_DIR, "reg_pipeline.pkl"), "rb") as f:
    REG_MODEL = pickle.load(f)

with open(os.path.join(BASE_DIR, "model_metadata.json")) as f:
    METADATA = json.load(f)

CLF_FEATURES = METADATA["features"]
REG_FEATURES = METADATA["reg_features"]

# ── Database Setup ────────────────────────────────────────────────────────────
DB_PATH = os.path.join(BASE_DIR, "predictions.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp  TEXT NOT NULL,
            task       TEXT NOT NULL,
            inputs     TEXT NOT NULL,
            result     TEXT NOT NULL,
            latency_ms REAL
        )
    """)
    conn.commit()
    conn.close()

init_db()

def log_prediction(task, inputs, result, latency_ms):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO predictions (timestamp, task, inputs, result, latency_ms) VALUES (?,?,?,?,?)",
        (datetime.datetime.utcnow().isoformat(), task,
         json.dumps(inputs), json.dumps(result), latency_ms)
    )
    conn.commit()
    conn.close()

def extract_features(data, feature_list):
    row = [float(data.get(f, np.nan)) if data.get(f) is not None else np.nan
           for f in feature_list]
    return np.array([row])

# ── Health Check Route (VERY IMPORTANT FOR VERCEL) ─────────────────────────────
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "ExoScope API Running",
        "message": "Backend is live"
    })

@app.route("/", methods=["GET"])
def home():
    return "ExoScope Backend Running"

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models": ["classifier (RandomForest)", "regressor (GradientBoosting)"],
        "clf_metrics": METADATA["clf_metrics"],
        "reg_metrics": METADATA["reg_metrics"]
    })

    @app.route('/')
def home():
    return "ExoScope Backend Running"

# ── Classification Route ───────────────────────────────────────────────────────
@app.route("/predict/classification", methods=["POST"])
def predict_classification():
    t0 = time.time()
    try:
        data = request.get_json(force=True)
        X = extract_features(data, CLF_FEATURES)
        proba = CLF_MODEL.predict_proba(X)[0]
        pred_label = "CONFIRMED" if proba[1] >= 0.5 else "FALSE POSITIVE"
        result = {
            "prediction": pred_label,
            "confidence": round(float(max(proba)), 4),
            "prob_confirmed": round(float(proba[1]), 4),
            "prob_false_positive": round(float(proba[0]), 4),
            "model_metrics": METADATA["clf_metrics"],
            "feature_importance": METADATA["feature_importance_clf"]
        }
        latency = round((time.time() - t0) * 1000, 2)
        log_prediction("classification", data, result, latency)
        result["latency_ms"] = latency
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 400

# ── Regression Route ───────────────────────────────────────────────────────────
@app.route("/predict/regression", methods=["POST"])
def predict_regression():
    t0 = time.time()
    try:
        data = request.get_json(force=True)
        X = extract_features(data, REG_FEATURES)
        log_pred = REG_MODEL.predict(X)[0]
        pred_radius = float(np.expm1(log_pred))
        pred_radius = max(pred_radius, 0.01)
        result = {
            "prediction_earth_radii": round(pred_radius, 4),
            "confidence_interval": [
                round(max(pred_radius * 0.85, 0.01), 4),
                round(pred_radius * 1.15, 4)
            ],
            "size_category": (
                "Sub-Earth"   if pred_radius < 0.8  else
                "Earth-like"  if pred_radius < 1.25 else
                "Super-Earth" if pred_radius < 2.0  else
                "Mini-Neptune"if pred_radius < 4.0  else
                "Neptune-like"if pred_radius < 10.0 else
                "Gas Giant"
            ),
            "model_metrics": METADATA["reg_metrics"],
            "feature_importance": METADATA["feature_importance_reg"]
        }
        latency = round((time.time() - t0) * 1000, 2)
        log_prediction("regression", data, result, latency)
        result["latency_ms"] = latency
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 400

# ── History Route ──────────────────────────────────────────────────────────────
@app.route("/history", methods=["GET"])
def history():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT id, timestamp, task, result, latency_ms "
        "FROM predictions ORDER BY id DESC LIMIT 50"
    ).fetchall()
    conn.close()
    return jsonify([
        {"id": r[0], "timestamp": r[1], "task": r[2],
         "result": json.loads(r[3]), "latency_ms": r[4]}
        for r in rows
    ])

@app.route("/metadata", methods=["GET"])
def metadata():
    return jsonify(METADATA)

# ── Render Deployment Entry Point ──────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
