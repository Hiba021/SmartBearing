from flask import Flask, jsonify, request
from flask_cors import CORS
import scipy.io as sio
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# -------------------------------------------------------
# CONFIG - CHANGE THIS TO YOUR DATASET PATH
# -------------------------------------------------------
DATA_PATH = r'C:\BearingDataSet\archive\raw\B007_1_123.mat'  # adjust if needed

# -------------------------------------------------------
# LOAD MAT FILE
# -------------------------------------------------------
def load_mat_file(filename):
    file_path = os.path.join(DATA_PATH, filename)
    mat = sio.loadmat(file_path)
    return mat

@app.route("/api/files")
def get_files():
    files = [f for f in os.listdir(DATA_PATH) if f.endswith(".mat")]
    return jsonify(files)

@app.route("/api/signal")
def get_signal():

    file = request.args.get("file")

    mat = load_mat_file(file)

    # CWRU dataset usually contains keys like:
    # X123_DE_time, X123_FE_time, etc.

    signals = {}

    for key in mat.keys():
        if "DE_time" in key or "FE_time" in key:
            signals[key] = mat[key].flatten().tolist()

    return jsonify(signals)
if __name__ == "__main__":
    app.run(debug=True)
    