import os
import sys
import pytest
import numpy as np

# Add the backend folder to sys.path so we can import the modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from pipeline_routes import _compute_features, _extract_window, WINDOW_SIZE

def test_extract_window():
    """Test that a signal is correctly sliced into a 2048-sample window."""
    # Create a dummy signal of 5000 samples
    dummy_signal = np.arange(5000)
    
    # Extract window 0
    window, start, end = _extract_window(dummy_signal, 0)
    assert len(window) == WINDOW_SIZE
    assert start == 0
    assert end == WINDOW_SIZE
    assert window[0] == 0
    assert window[-1] == WINDOW_SIZE - 1
    
    # Extract window 1
    window2, start2, end2 = _extract_window(dummy_signal, 1)
    assert len(window2) == WINDOW_SIZE
    assert start2 == WINDOW_SIZE
    assert end2 == WINDOW_SIZE * 2
    assert window2[0] == WINDOW_SIZE

def test_extract_window_out_of_bounds():
    """Test boundary conditions when window index is too high."""
    dummy_signal = np.arange(1000)
    window, start, end = _extract_window(dummy_signal, 1)
    assert window is None
    assert start == WINDOW_SIZE
    assert end == WINDOW_SIZE * 2

def test_compute_features():
    """Test the statistical feature extraction function."""
    # Create a simple synthetic sine wave window with some noise
    t = np.linspace(0, 1, WINDOW_SIZE)
    window = np.sin(2 * np.pi * 50 * t)  # 50 Hz sine wave
    
    features, feat_array = _compute_features(window)
    
    # Basic assertions
    assert len(features) == 9
    assert len(feat_array) == 9
    assert 'rms' in features
    assert 'kurtosis' in features
    
    # Sine wave RMS should be approx 0.707
    assert np.isclose(features['rms'], 0.707, atol=0.05)
    # Sine wave mean should be approx 0
    assert np.isclose(features['mean'], 0.0, atol=0.05)
    # Sine wave max should be approx 1
    assert np.isclose(features['max'], 1.0, atol=0.05)
