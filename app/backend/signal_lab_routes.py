"""
BearingIQ — Signal Laboratory Backend Routes
Provides REST endpoints for the Signal Laboratory page.
Integrated into app.py via: from signal_lab_routes import register_lab_routes
"""

import os
import json
import numpy as np

try:
    import scipy.io as sio
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

from flask import jsonify, request

# ─────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR  = os.path.abspath(os.path.join(BASE_DIR, '..', '..'))
RAW_DIR   = os.path.join(ROOT_DIR, 'archive', 'raw')

# ─────────────────────────────────────────────────────────────
# Signal Generation (Python fallback when .mat not available)
# ─────────────────────────────────────────────────────────────
def generate_synthetic_signal(fault_type: str = 'normal', n_samples: int = 48000) -> list:
    """Generate a realistic synthetic bearing vibration signal."""
    fs = 48000
    t = np.arange(n_samples) / fs
    rot_freq = 1797 / 60  # ~29.95 Hz

    # Base vibration
    signal = 0.24 * np.sin(2 * np.pi * rot_freq * t)
    signal += 0.09 * np.sin(2 * np.pi * rot_freq * 2 * t + 0.3)
    signal += 0.05 * np.sin(2 * np.pi * rot_freq * 3 * t + 1.1)

    # Fault impulses
    fault_configs = {
        'ball':  {'freq': 141, 'amp': 0.8,  'noise': 0.08},
        'inner': {'freq': 162, 'amp': 1.2,  'noise': 0.09},
        'outer': {'freq': 107, 'amp': 2.0,  'noise': 0.12},
    }

    if fault_type in fault_configs:
        cfg = fault_configs[fault_type]
        for i, ti in enumerate(t):
            phase = (ti * cfg['freq']) % 1.0
            if phase < 0.02:
                decay = np.exp(-phase * 400)
                signal[i] += cfg['amp'] * decay * np.sin(2 * np.pi * 3000 * ti)
        noise_std = cfg['noise']
    else:
        noise_std = 0.05

    rng = np.random.default_rng(42)
    signal += noise_std * rng.standard_normal(n_samples)
    return signal.tolist()


# ─────────────────────────────────────────────────────────────
# Feature Extraction
# ─────────────────────────────────────────────────────────────
def extract_features(signal: np.ndarray) -> dict:
    """Extract 9 statistical features from a signal window."""
    from scipy import stats as sp_stats
    x = np.asarray(signal, dtype=float)
    n = len(x)

    feat_max      = float(np.max(x))
    feat_min      = float(np.min(x))
    feat_mean     = float(np.mean(x))
    feat_sd       = float(np.std(x, ddof=0))
    feat_rms      = float(np.sqrt(np.mean(x ** 2)))
    feat_skewness = float(sp_stats.skew(x))
    feat_kurtosis = float(sp_stats.kurtosis(x, fisher=False))  # Pearson (normal=3)
    feat_crest    = float(np.max(np.abs(x)) / feat_rms) if feat_rms > 0 else 0.0
    feat_form     = float(feat_rms / np.mean(np.abs(x))) if np.mean(np.abs(x)) > 0 else 0.0

    return {
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


# ─────────────────────────────────────────────────────────────
# MAT File Loading
# ─────────────────────────────────────────────────────────────
def load_mat_signal(filename: str, variable: str = None) -> dict:
    """Load signal data from a MATLAB .mat file."""
    if not SCIPY_AVAILABLE:
        return {'error': 'scipy not available', 'signal': []}

    filepath = os.path.join(RAW_DIR, filename)
    if not os.path.exists(filepath):
        return {'error': f'File not found: {filename}', 'signal': []}

    try:
        mat = sio.loadmat(filepath)
        # Find DE_time variable
        de_key = variable or next(
            (k for k in mat.keys() if 'DE_time' in k), None
        )
        if de_key is None:
            return {'error': 'No DE_time variable found', 'variables': [k for k in mat.keys() if not k.startswith('_')]}

        signal = mat[de_key].flatten().astype(float)
        return {
            'variable': de_key,
            'shape':    list(signal.shape),
            'n_samples': int(len(signal)),
            'signal':   signal[:2048].tolist(),  # First window only (performance)
            'full_length': int(len(signal)),
            'sampling_rate': 48000,
            'duration_s': round(len(signal) / 48000, 4),
        }
    except Exception as e:
        return {'error': str(e), 'signal': []}


# ─────────────────────────────────────────────────────────────
# Route Registration
# ─────────────────────────────────────────────────────────────
def register_lab_routes(app):
    """Register all Signal Laboratory API routes on the Flask app."""

    @app.route('/api/lab/signal', methods=['GET'])
    def lab_signal():
        """
        Returns signal data for visualization.
        Query params:
          - file: MAT filename (optional)
          - type: fault type for synthetic signal (normal/ball/inner/outer)
          - n: number of samples (default 4096)
        """
        file_param = request.args.get('file', None)
        fault_type = request.args.get('type', 'normal')
        n_samples  = min(int(request.args.get('n', 4096)), 96000)

        if file_param and os.path.exists(os.path.join(RAW_DIR, file_param)):
            result = load_mat_signal(file_param)
            result['source'] = 'mat_file'
        else:
            result = {
                'source':        'synthetic',
                'signal':        generate_synthetic_signal(fault_type, n_samples),
                'n_samples':     n_samples,
                'sampling_rate': 48000,
                'fault_type':    fault_type,
                'duration_s':    round(n_samples / 48000, 4),
            }
        return jsonify(result)


    @app.route('/api/lab/features', methods=['POST'])
    def lab_features():
        """
        Compute 9 statistical features from a submitted signal array.
        Body: { "signal": [...], "window_size": 2048 }
        """
        data        = request.get_json(force=True)
        signal      = data.get('signal', [])
        window_size = int(data.get('window_size', 2048))
        window_idx  = int(data.get('window_index', 0))

        if not signal:
            return jsonify({'error': 'No signal data provided'}), 400

        arr   = np.asarray(signal, dtype=float)
        start = window_idx * window_size
        end   = start + window_size
        window = arr[start:end]

        if len(window) == 0:
            return jsonify({'error': 'Window out of range'}), 400

        feats = extract_features(window)
        feats['window_index'] = window_idx
        feats['window_size']  = int(len(window))
        feats['window_start'] = int(start)
        feats['window_end']   = int(start + len(window) - 1)
        return jsonify(feats)


    @app.route('/api/lab/mat-files', methods=['GET'])
    def lab_mat_files():
        """List available MAT files in the raw directory."""
        if not os.path.exists(RAW_DIR):
            return jsonify({'files': [], 'dir': RAW_DIR, 'available': False})

        files = sorted([f for f in os.listdir(RAW_DIR) if f.endswith('.mat')])
        return jsonify({
            'files':     files,
            'count':     len(files),
            'dir':       RAW_DIR,
            'available': True,
        })


    @app.route('/api/lab/window-features', methods=['GET'])
    def lab_window_features():
        """
        Compute features for all windows of a given signal type.
        Returns dataset statistics suitable for visualization.
        """
        fault_type  = request.args.get('type', 'normal')
        window_size = int(request.args.get('window_size', 2048))
        n_total     = 48000 * 10  # Simulate full 10s recording

        signal = np.asarray(generate_synthetic_signal(fault_type, n_total))
        n_windows = len(signal) // window_size

        results = []
        for i in range(n_windows):
            w = signal[i * window_size:(i + 1) * window_size]
            f = extract_features(w)
            f['window'] = i
            results.append(f)

        # Aggregate stats
        feat_names = ['max','min','mean','sd','rms','skewness','kurtosis','crest','form']
        summary = {}
        for fn in feat_names:
            vals = [r[fn] for r in results]
            summary[fn] = {
                'mean': round(float(np.mean(vals)), 4),
                'std':  round(float(np.std(vals)), 4),
                'min':  round(float(np.min(vals)), 4),
                'max':  round(float(np.max(vals)), 4),
            }

        return jsonify({
            'fault_type':  fault_type,
            'n_windows':   n_windows,
            'window_size': window_size,
            'windows':     results[:20],  # Return first 20 for display
            'summary':     summary,
        })


    @app.route('/api/lab/pipeline-info', methods=['GET'])
    def lab_pipeline_info():
        """Return ML pipeline configuration and performance info."""
        info = {
            'pipeline_steps': [
                {'id': 'csv',   'name': 'CSV Dataset',      'description': 'Bearing.csv — 2370 rows × 10 columns'},
                {'id': 'split', 'name': 'Train/Test Split', 'description': '80% train / 20% test, stratified by class'},
                {'id': 'scale', 'name': 'StandardScaler',   'description': 'Zero mean, unit variance per feature'},
                {'id': 'rf',    'name': 'Random Forest',    'description': '100 trees, Gini impurity, parallel training'},
                {'id': 'svm',   'name': 'SVM',              'description': 'RBF kernel, C=10, gamma=scale'},
                {'id': 'pred',  'name': 'Prediction',       'description': '>99% accuracy on 10 fault classes'},
            ],
            'models': {
                'random_forest': {'accuracy': 0.994, 'f1': 0.994, 'n_estimators': 100},
                'svm':           {'accuracy': 0.992, 'f1': 0.992, 'kernel': 'rbf'},
            },
            'dataset': {
                'total_samples': 2370,
                'n_features':    9,
                'n_classes':     10,
                'window_size':   2048,
                'sampling_rate': 48000,
            },
            'features': ['max','min','mean','sd','rms','skewness','kurtosis','crest','form'],
        }

        # Try to add real model info if available
        model_dir  = os.path.join(BASE_DIR, 'models')
        info_path  = os.path.join(model_dir, 'model_info.json')
        if os.path.exists(info_path):
            with open(info_path) as f:
                real_info = json.load(f)
            info['models'].update(real_info)

        return jsonify(info)
