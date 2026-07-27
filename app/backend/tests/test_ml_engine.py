import os
import sys
import pytest
import numpy as np
import pickle

# Add the backend folder to sys.path so we can import the modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ml_engine import MODEL_DIR, RF_MODEL_PATH, SVM_MODEL_PATH, SCALER_PATH

@pytest.fixture
def models():
    """Load the pre-trained models and scaler."""
    assert os.path.exists(RF_MODEL_PATH), "Random Forest model file missing!"
    assert os.path.exists(SVM_MODEL_PATH), "SVM model file missing!"
    assert os.path.exists(SCALER_PATH), "Scaler file missing!"
    
    with open(RF_MODEL_PATH, 'rb') as f:
        rf = pickle.load(f)
    with open(SVM_MODEL_PATH, 'rb') as f:
        svm = pickle.load(f)
    with open(SCALER_PATH, 'rb') as f:
        scaler = pickle.load(f)
        
    return rf, svm, scaler

def test_models_exist(models):
    """Ensure models are successfully loaded from disk."""
    rf, svm, scaler = models
    assert rf is not None
    assert svm is not None
    assert scaler is not None
    
def test_random_forest_prediction_shape(models):
    """Test that the RF model can accept a 9-feature array and output a prediction."""
    rf, _, scaler = models
    
    # Create a dummy feature array (9 features)
    dummy_features = np.array([[1.0, 0.5, 0.1, 0.2, 0.3, 0.0, 3.0, 1.5, 1.2]])
    
    # Scale it
    scaled = scaler.transform(dummy_features)
    
    # Predict
    pred = rf.predict(scaled)
    probs = rf.predict_proba(scaled)
    
    # Assertions
    assert len(pred) == 1
    assert probs.shape[1] == 10  # 10 classes
    assert np.isclose(np.sum(probs[0]), 1.0)

def test_svm_prediction_shape(models):
    """Test that the SVM model can accept a 9-feature array and output a prediction."""
    _, svm, scaler = models
    
    dummy_features = np.array([[1.0, 0.5, 0.1, 0.2, 0.3, 0.0, 3.0, 1.5, 1.2]])
    scaled = scaler.transform(dummy_features)
    
    pred = svm.predict(scaled)
    probs = svm.predict_proba(scaled)
    
    assert len(pred) == 1
    assert probs.shape[1] == 10
    assert np.isclose(np.sum(probs[0]), 1.0)
