import scipy.io
import matplotlib.pyplot as plt

file_path = r"C:\Users\user\Downloads\archive\raw\B007_1_123.mat"

mat = scipy.io.loadmat(file_path)

signal = mat["X123_DE_time"].flatten()

print(signal.shape)

plt.figure(figsize=(15,4))

plt.plot(signal)

plt.grid(True)

plt.title("Complete Drive-End Signal")

plt.xlabel("Sample Number")

plt.ylabel("Acceleration (g)")

plt.show()