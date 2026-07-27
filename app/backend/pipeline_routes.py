"""
BearingIQ — Signal Processing Pipeline Backend Routes
Provides REST endpoints for the Pipeline diagnostic page.
Integrated into app.py via: from pipeline_routes import register_pipeline_routes
"""

import os
import pickle
import tempfile
import numpy as np

try:
    import scipy.io as sio
    import scipy.stats as sp_stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

from flask import jsonify, request

# ─────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR  = os.path.join(BASE_DIR, 'models')
RF_MODEL_PATH  = os.path.join(MODEL_DIR, 'random_forest.pkl')
SCALER_PATH    = os.path.join(MODEL_DIR, 'scaler.pkl')
ENCODER_PATH   = os.path.join(MODEL_DIR, 'encoder.pkl')
SVM_MODEL_PATH = os.path.join(MODEL_DIR, 'svm.pkl')

SAMPLE_RATE  = 48000
WINDOW_SIZE  = 2048
MAX_CHART_PTS = 5000

FEATURES = ['max', 'min', 'mean', 'sd', 'rms', 'skewness', 'kurtosis', 'crest', 'form']

# ─────────────────────────────────────────────────────────────
# Fault metadata (mirrors ml_engine.py)
# ─────────────────────────────────────────────────────────────
FAULT_META = {
    "Normal_1":     {"label": "Normal",              "type": "normal",  "severity": 0,  "color": "#10B981"},
    "Ball_007_1":   {"label": "Ball — 0.007\"",       "type": "ball",    "severity": 1,  "color": "#F59E0B"},
    "Ball_014_1":   {"label": "Ball — 0.014\"",       "type": "ball",    "severity": 2,  "color": "#F97316"},
    "Ball_021_1":   {"label": "Ball — 0.021\"",       "type": "ball",    "severity": 3,  "color": "#EF4444"},
    "IR_007_1":     {"label": "Inner Race — 0.007\"", "type": "inner",   "severity": 1,  "color": "#8B5CF6"},
    "IR_014_1":     {"label": "Inner Race — 0.014\"", "type": "inner",   "severity": 2,  "color": "#7C3AED"},
    "IR_021_1":     {"label": "Inner Race — 0.021\"", "type": "inner",   "severity": 3,  "color": "#6D28D9"},
    "OR_007_6_1":   {"label": "Outer Race — 0.007\"", "type": "outer",   "severity": 1,  "color": "#3B82F6"},
    "OR_014_6_1":   {"label": "Outer Race — 0.014\"", "type": "outer",   "severity": 2,  "color": "#2563EB"},
    "OR_021_6_1":   {"label": "Outer Race — 0.021\"", "type": "outer",   "severity": 3,  "color": "#1D4ED8"},
}

# ─────────────────────────────────────────────────────────────
# In-memory cache for uploaded .mat files
# ─────────────────────────────────────────────────────────────
_uploaded_files = {}   # { filename: { 'mat': dict, 'de_key': str, ... } }


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
def _meta_keys():
    """MATLAB internal keys to ignore."""
    return {'__header__', '__version__', '__globals__'}


def _detect_keys(mat):
    """Detect DE, FE, BA, and RPM variable keys from a loaded .mat dict."""
    user_keys = [k for k in mat.keys() if k not in _meta_keys()]

    de_key = next((k for k in user_keys if '_DE_time' in k), None)
    fe_key = next((k for k in user_keys if '_FE_time' in k), None)
    ba_key = next((k for k in user_keys if '_BA_time' in k), None)
    rpm_key = next((k for k in user_keys if 'RPM' in k.upper()), None)

    return user_keys, de_key, fe_key, ba_key, rpm_key


def _get_cached(filename):
    """Return cached entry or None."""
    return _uploaded_files.get(filename, None)


def _extract_window(signal, window_index):
    """Extract a 2048-sample window from signal array."""
    start = window_index * WINDOW_SIZE
    end   = start + WINDOW_SIZE
    if start >= len(signal):
        return None, start, end
    window = signal[start:end]
    return window, start, end


def _compute_features(window):
    """Compute the 9 statistical features for a signal window."""
    x = np.asarray(window, dtype=float)

    feat_max      = float(np.max(x))
    feat_min      = float(np.min(x))
    feat_mean     = float(np.mean(x))
    feat_sd       = float(np.std(x, ddof=0))
    feat_rms      = float(np.sqrt(np.mean(x ** 2)))
    feat_skewness = float(sp_stats.skew(x))
    feat_kurtosis = float(sp_stats.kurtosis(x, fisher=True))
    feat_crest    = float(np.max(np.abs(x)) / feat_rms) if feat_rms > 0 else 0.0
    mean_abs      = float(np.mean(np.abs(x)))
    feat_form     = float(feat_rms / mean_abs) if mean_abs > 0 else 0.0

    features = {
        'max':      round(feat_max, 6),
        'min':      round(feat_min, 6),
        'mean':     round(feat_mean, 6),
        'sd':       round(feat_sd, 6),
        'rms':      round(feat_rms, 6),
        'skewness': round(feat_skewness, 6),
        'kurtosis': round(feat_kurtosis, 6),
        'crest':    round(feat_crest, 6),
        'form':     round(feat_form, 6),
    }

    feature_array = [features[f] for f in FEATURES]
    return features, feature_array


def _downsample(signal, max_points):
    """Downsample a signal to at most max_points via decimation."""
    n = len(signal)
    if n <= max_points:
        return signal.tolist()
    step = max(1, n // max_points)
    return signal[::step].tolist()


# ─────────────────────────────────────────────────────────────
# Route Registration
# ─────────────────────────────────────────────────────────────
def register_pipeline_routes(app):
    """Register all Signal Processing Pipeline API routes on the Flask app."""

    # ─── POST /api/pipeline/upload ────────────────────────
    @app.route('/api/pipeline/upload', methods=['POST'])
    def pipeline_upload():
        """
        Accept a .mat file upload, parse variables, and return metadata.
        """
        if not SCIPY_AVAILABLE:
            return jsonify({'error': 'scipy is not installed'}), 500

        if 'file' not in request.files:
            return jsonify({'error': 'No file part in request'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not file.filename.lower().endswith('.mat'):
            return jsonify({'error': 'Only .mat files are supported'}), 400

        # Save to temp location
        tmp_dir = tempfile.gettempdir()
        save_path = os.path.join(tmp_dir, file.filename)
        file.save(save_path)

        try:
            mat = sio.loadmat(save_path)
        except Exception as e:
            return jsonify({'error': f'Failed to load .mat file: {str(e)}'}), 400

        user_keys, de_key, fe_key, ba_key, rpm_key = _detect_keys(mat)

        # Build variable info list
        variables = []
        for k in user_keys:
            val = mat[k]
            shape = list(val.shape) if hasattr(val, 'shape') else []
            dtype = str(val.dtype) if hasattr(val, 'dtype') else type(val).__name__
            variables.append({'name': k, 'shape': shape, 'type': dtype})

        # Extract RPM if available
        rpm = None
        if rpm_key is not None:
            try:
                rpm = int(mat[rpm_key].flatten()[0])
            except Exception:
                rpm = None

        # Total samples from DE signal
        total_samples = 0
        if de_key is not None:
            signal = mat[de_key].flatten().astype(float)
            total_samples = int(len(signal))

        duration_seconds = round(total_samples / SAMPLE_RATE, 4) if total_samples > 0 else 0
        n_windows = total_samples // WINDOW_SIZE

        # Cache for reuse
        _uploaded_files[file.filename] = {
            'mat': mat,
            'de_key': de_key,
            'fe_key': fe_key,
            'ba_key': ba_key,
            'path': save_path,
        }

        return jsonify({
            'filename':         file.filename,
            'variables':        variables,
            'de_key':           de_key,
            'fe_key':           fe_key,
            'ba_key':           ba_key,
            'rpm':              rpm,
            'total_samples':    total_samples,
            'duration_seconds': duration_seconds,
            'n_windows':        n_windows,
        })


    # ─── POST /api/pipeline/signal ────────────────────────
    @app.route('/api/pipeline/signal', methods=['POST'])
    def pipeline_signal():
        """
        Return the full DE signal (downsampled to max 5000 points for charting).
        Body: { "filename": "..." }
        """
        data = request.get_json(force=True)
        filename = data.get('filename', '')

        entry = _get_cached(filename)
        if entry is None:
            return jsonify({'error': f'File not loaded: {filename}. Upload first.'}), 404

        de_key = entry.get('de_key')
        if de_key is None:
            return jsonify({'error': 'No DE_time variable found in file'}), 400

        signal = entry['mat'][de_key].flatten().astype(float)
        total_samples = int(len(signal))
        downsampled = _downsample(signal, MAX_CHART_PTS)

        return jsonify({
            'signal':        downsampled,
            'sample_rate':   SAMPLE_RATE,
            'total_samples': total_samples,
            'de_key':        de_key,
        })


    # ─── POST /api/pipeline/window ────────────────────────
    @app.route('/api/pipeline/window', methods=['POST'])
    def pipeline_window():
        """
        Return a specific 2048-sample window from the DE signal.
        Body: { "filename": "...", "window_index": 0 }
        """
        data = request.get_json(force=True)
        filename     = data.get('filename', '')
        window_index = int(data.get('window_index', 0))

        entry = _get_cached(filename)
        if entry is None:
            return jsonify({'error': f'File not loaded: {filename}. Upload first.'}), 404

        de_key = entry.get('de_key')
        if de_key is None:
            return jsonify({'error': 'No DE_time variable found in file'}), 400

        signal = entry['mat'][de_key].flatten().astype(float)
        window, start, end = _extract_window(signal, window_index)

        if window is None or len(window) == 0:
            return jsonify({'error': f'Window index {window_index} is out of range'}), 400

        return jsonify({
            'window':       window.tolist(),
            'window_index': window_index,
            'start_sample': int(start),
            'end_sample':   int(start + len(window) - 1),
        })


    # ─── POST /api/pipeline/features ──────────────────────
    @app.route('/api/pipeline/features', methods=['POST'])
    def pipeline_features():
        """
        Compute the 9 statistical features for a given window.
        Body: { "filename": "...", "window_index": 0 }
        """
        data = request.get_json(force=True)
        filename     = data.get('filename', '')
        window_index = int(data.get('window_index', 0))

        entry = _get_cached(filename)
        if entry is None:
            return jsonify({'error': f'File not loaded: {filename}. Upload first.'}), 404

        de_key = entry.get('de_key')
        if de_key is None:
            return jsonify({'error': 'No DE_time variable found in file'}), 400

        signal = entry['mat'][de_key].flatten().astype(float)
        window, start, end = _extract_window(signal, window_index)

        if window is None or len(window) == 0:
            return jsonify({'error': f'Window index {window_index} is out of range'}), 400

        features, feature_array = _compute_features(window)

        return jsonify({
            'features':      features,
            'feature_array': feature_array,
            'window_index':  window_index,
        })


    # ─── POST /api/pipeline/predict ───────────────────────
    @app.route('/api/pipeline/predict', methods=['POST'])
    def pipeline_predict():
        """
        Full pipeline: extract window → compute features → scale → predict
        with both Random Forest and SVM models.
        Body: { "filename": "...", "window_index": 0 }
        """
        data = request.get_json(force=True)
        filename     = data.get('filename', '')
        window_index = int(data.get('window_index', 0))

        # ── Validate uploaded file ───────────────────
        entry = _get_cached(filename)
        if entry is None:
            return jsonify({'error': f'File not loaded: {filename}. Upload first.'}), 404

        de_key = entry.get('de_key')
        if de_key is None:
            return jsonify({'error': 'No DE_time variable found in file'}), 400

        signal = entry['mat'][de_key].flatten().astype(float)
        window, start, end = _extract_window(signal, window_index)

        if window is None or len(window) == 0:
            return jsonify({'error': f'Window index {window_index} is out of range'}), 400

        # ── Compute features ─────────────────────────
        features, feature_array = _compute_features(window)

        # ── Load scaler, models, encoder ─────────────
        required_files = {
            'scaler':  SCALER_PATH,
            'rf':      RF_MODEL_PATH,
            'svm':     SVM_MODEL_PATH,
            'encoder': ENCODER_PATH,
        }
        for name, path in required_files.items():
            if not os.path.exists(path):
                return jsonify({'error': f'Model file not found: {name} ({path})'}), 500

        try:
            with open(SCALER_PATH, 'rb') as f:
                scaler = pickle.load(f)
            with open(RF_MODEL_PATH, 'rb') as f:
                rf_model = pickle.load(f)
            with open(SVM_MODEL_PATH, 'rb') as f:
                svm_model = pickle.load(f)
            with open(ENCODER_PATH, 'rb') as f:
                encoder = pickle.load(f)
        except Exception as e:
            return jsonify({'error': f'Failed to load model files: {str(e)}'}), 500

        # ── Scale features ───────────────────────────
        X = np.array(feature_array).reshape(1, -1)
        X_scaled = scaler.transform(X)
        scaled_features = [round(float(v), 6) for v in X_scaled.flatten()]

        # ── Predict with Random Forest ───────────────
        rf_pred_int  = rf_model.predict(X_scaled)[0]
        rf_proba     = rf_model.predict_proba(X_scaled)[0]
        rf_class     = encoder.inverse_transform([rf_pred_int])[0]
        rf_confidence = round(float(np.max(rf_proba)), 4)
        rf_classes   = encoder.inverse_transform(range(len(rf_proba)))
        rf_probs     = {cls: round(float(p), 6) for cls, p in zip(rf_classes, rf_proba)}

        # ── Predict with SVM ─────────────────────────
        svm_pred_int  = svm_model.predict(X_scaled)[0]
        svm_proba     = svm_model.predict_proba(X_scaled)[0]
        svm_class     = encoder.inverse_transform([svm_pred_int])[0]
        svm_confidence = round(float(np.max(svm_proba)), 4)
        svm_classes   = encoder.inverse_transform(range(len(svm_proba)))
        svm_probs     = {cls: round(float(p), 6) for cls, p in zip(svm_classes, svm_proba)}

        # ── Build response ───────────────────────────
        rf_meta  = FAULT_META.get(rf_class, {})
        svm_meta = FAULT_META.get(svm_class, {})

        return jsonify({
            'rf_prediction': {
                'class':         rf_class,
                'confidence':    rf_confidence,
                'probabilities': rf_probs,
                'label':         rf_meta.get('label', rf_class),
                'severity':      rf_meta.get('severity', 0),
                'color':         rf_meta.get('color', '#999'),
            },
            'svm_prediction': {
                'class':         svm_class,
                'confidence':    svm_confidence,
                'probabilities': svm_probs,
                'label':         svm_meta.get('label', svm_class),
                'severity':      svm_meta.get('severity', 0),
                'color':         svm_meta.get('color', '#999'),
            },
            'features':        features,
            'scaled_features': scaled_features,
            'window_index':    window_index,
        })
