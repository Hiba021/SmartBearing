import scipy.io

# USE RAW STRING (r'...') to fix the backslash issue
file_path = r'C:\BearingDataSet\archive\raw\B007_1_123.mat'

try:
    mat_data = scipy.io.loadmat(file_path)
    print(" File loaded successfully!")
    print("Variables in this file:", mat_data.keys())
    
    # Show the data
    for key in mat_data.keys():
        if not key.startswith('__'):
            print(f"\nVariable '{key}':")
            print(mat_data[key])
            
except FileNotFoundError:
    print(f"❌ File not found at: {file_path}")
    print("Check if the file exists and the path is correct")
except Exception as e:
    print(f"❌ Error: {e}")

print(mat_data["X123_DE_time"].shape)
print(mat_data["X123_FE_time"].shape)

import matplotlib.pyplot as plt

signal = mat_data["X123_DE_time"]

plt.figure(figsize=(15,4))
plt.plot(signal)
plt.title("Raw DE Signal")
plt.show()

plt.plot(signal[:2048])
plt.show()