"""
BearingIQ — Flask REST API
Serves ML predictions, statistics, AI advice, and static frontend files.
"""

import json
import os
import sys
import traceback
import numpy as np
from dotenv import load_dotenv

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Load environment variables
load_dotenv()

# ── Path setup ────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))
MODEL_DIR    = os.path.join(BASE_DIR, "models")

sys.path.insert(0, BASE_DIR)

import ml_engine as ml
import ai_adviser as adviser
import signal_lab_routes as lab
import pipeline_routes as pipeline
import attention_explainer as explainer

# ─────────────────────────────────────────────────────────────
# Flask app
# ─────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)
lab.register_lab_routes(app)
pipeline.register_pipeline_routes(app)

# Prevent caching for frontend files during dev
@app.after_request
def prevent_cache(resp):
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp


# ─────────────────────────────────────────────────────────────
# Static frontend routes
# ─────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)


# ─────────────────────────────────────────────────────────────
# API — Dataset info
# ─────────────────────────────────────────────────────────────
@app.route("/api/classes", methods=["GET"])
def api_classes():
    df = ml.get_dataframe()
    counts = df[ml.TARGET].value_counts().to_dict()
    result = []
    for cls, count in counts.items():
        meta = ml.FAULT_META.get(cls, {})
        result.append({
            "class":    cls,
            "label":    meta.get("label", cls),
            "count":    int(count),
            "color":    meta.get("color", "#999"),
            "type":     meta.get("type", "unknown"),
            "severity": meta.get("severity", 0),
        })
    return jsonify({"classes": result, "total": int(len(df)), "features": ml.FEATURES})


@app.route("/api/stats", methods=["GET"])
def api_stats():
    cache = os.path.join(MODEL_DIR, "stats_cache.json")
    if os.path.exists(cache):
        with open(cache) as f:
            return jsonify(json.load(f))
    df = ml.get_dataframe()
    stats = ml.compute_statistics(df)
    return jsonify(stats)


@app.route("/api/samples", methods=["GET"])
def api_samples():
    fault_class = request.args.get("class", None)
    n = int(request.args.get("n", 10))
    samples = ml.get_samples(fault_class, n)
    return jsonify({"samples": samples, "class": fault_class, "n": len(samples)})


@app.route("/api/centroids", methods=["GET"])
def api_centroids():
    return jsonify(ml.get_class_centroids())


# ─────────────────────────────────────────────────────────────
# API — Model info
# ─────────────────────────────────────────────────────────────
@app.route("/api/model/info", methods=["GET"])
def api_model_info():
    info_path = os.path.join(MODEL_DIR, "model_info.json")
    if os.path.exists(info_path):
        with open(info_path) as f:
            return jsonify(json.load(f))
    return jsonify({"error": "Model not trained yet"}), 404


# ─────────────────────────────────────────────────────────────
# API — Prediction
# ─────────────────────────────────────────────────────────────
@app.route("/api/predict", methods=["POST", "OPTIONS"])
def api_predict():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        data = request.get_json(force=True)
        features = data.get("features", [])
        model_name = data.get("model", "random_forest")

        if len(features) != 9:
            return jsonify({"error": f"Expected 9 features, got {len(features)}"}), 400

        features = [float(v) for v in features]
        result = ml.predict(features, model_name)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/sensitivity", methods=["POST"])
def api_sensitivity():
    try:
        data = request.get_json(force=True)
        features   = [float(v) for v in data.get("features", [])]
        feat_idx   = int(data.get("feature_index", 0))
        result = ml.sensitivity_analysis(features, feat_idx)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────
# API — Attention-Based Feature Explainer (Deep Learning)
# ─────────────────────────────────────────────────────────────
@app.route("/api/explain", methods=["POST", "OPTIONS"])
def api_explain():
    """Run transformer self-attention explainability on the predicted class."""
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        data = request.get_json(force=True)
        # scaled_features: list of 9 floats (already Z-score normalized)
        scaled_features  = [float(v) for v in data.get("scaled_features", [])]
        predicted_class  = data.get("predicted_class", "Normal_1")
        raw_features     = data.get("raw_features", {})

        if len(scaled_features) != 9:
            return jsonify({"error": f"Expected 9 scaled features, got {len(scaled_features)}"}), 400

        result = explainer.explain_prediction(
            scaled_features  = scaled_features,
            predicted_class  = predicted_class,
            raw_features     = raw_features,
        )
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────
# API — AI Adviser
# ─────────────────────────────────────────────────────────────
@app.route("/api/adviser", methods=["POST"])
def api_adviser():
    try:
        data = request.get_json(force=True)
        features     = [float(v) for v in data.get("features", [])]
        model_name   = data.get("model", "random_forest")
        chat_message = data.get("message", "")

        if len(features) != 9:
            return jsonify({"error": "Expected 9 feature values"}), 400

        prediction = ml.predict(features, model_name)
        advice     = adviser.generate_advice(prediction, chat_message)
        return jsonify({"prediction": prediction, "advice": advice})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────
# API — Health check
# ─────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({"status": "ok", "message": "BearingIQ backend is running"})


# ─────────────────────────────────────────────────────────────
# API — Correlation
# ─────────────────────────────────────────────────────────────
@app.route("/api/correlation", methods=["GET"])
def api_correlation():
    cache = os.path.join(MODEL_DIR, "stats_cache.json")
    if os.path.exists(cache):
        with open(cache) as f:
            data = json.load(f)
            return jsonify(data.get("correlation", {}))
    df = ml.get_dataframe()
    stats = ml.compute_statistics(df)
    return jsonify(stats["correlation"])


# ─────────────────────────────────────────────────────────────
# API — Full Report Data
# ─────────────────────────────────────────────────────────────
@app.route("/api/report", methods=["GET"])
def api_report():
    try:
        # Classes
        df = ml.get_dataframe()
        counts = df[ml.TARGET].value_counts().to_dict()
        classes_data = []
        for cls, count in counts.items():
            meta = ml.FAULT_META.get(cls, {})
            classes_data.append({
                "class": cls,
                "label": meta.get("label", cls),
                "count": int(count),
                "color": meta.get("color", "#999"),
                "type": meta.get("type", "unknown"),
                "severity": meta.get("severity", 0),
            })

        # Stats
        stats_cache = os.path.join(MODEL_DIR, "stats_cache.json")
        if os.path.exists(stats_cache):
            with open(stats_cache) as f:
                stats = json.load(f)
        else:
            stats = ml.compute_statistics(df)

        # Model info
        info_path = os.path.join(MODEL_DIR, "model_info.json")
        model_info = {}
        if os.path.exists(info_path):
            with open(info_path) as f:
                model_info = json.load(f)

        return jsonify({
            "classes": classes_data,
            "total_samples": int(len(df)),
            "features": ml.FEATURES,
            "stats": stats,
            "model_info": model_info,
            "generated_at": __import__('datetime').datetime.now().isoformat(),
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────
# Startup — train models
# ─────────────────────────────────────────────────────────────
def startup():
    """
    Server initialization routine.
    Prior to launching the Flask HTTP listener:
      1. Check if trained model weights are cached on disk.
      2. If missing, automatically calls ml.train_models() to build them.
      3. Outputs confirmation and details to terminal.
    """
    print("="*60)
    print(" BearingIQ — Bearing Fault Diagnosis Platform")
    print("="*60)
    print("[Server] Training / loading ML models…")
    
    # ml.get_models() triggers load_models() or train_models() depending on cache presence
    ml.get_models()
    
    print("[Server] Ready! Visit http://localhost:5000")
    print("="*60)


if __name__ == "__main__":
    startup()
    app.run(debug=False, host="0.0.0.0", port=5000)
