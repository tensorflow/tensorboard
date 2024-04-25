import json
import tensorflow as tf
import numpy as np
import time
import random

log_path = "main_plugin/logs/system_performance"

writer = tf.summary.create_file_writer(log_path)
ml_layer_names = ["Conv2D"]


def generate_random_data():
    while True:
        collected_data = []
        # Example of generating random data for 5 layers and 3 device types
        for layer_index in range(1):  # Assuming 5 layers for illustration
            layer_name = f"Layer_{ml_layer_names[0]}"
            cpu_data = {"data": [(np.random.rand(), np.random.rand()*10) for _ in range(1)]}
            # ram_data = {"data": [(np.random.rand(), np.random.rand()*10) for _ in range(10)]}
            # gpu_data = {"data": [(np.random.rand(), np.random.rand()*10) for _ in range(10)]}

            with writer.as_default():
                for device_type, data in [('CPU', cpu_data)]:#, ('RAM', ram_data), ('GPU', gpu_data)
                    try:
                        times, energies = zip(*data["data"])
                        for time_point, energy in zip(times, energies):
                            tf.summary.scalar(f"{layer_name}/{device_type}",
                                              energy,
                                              step=int(time_point*1000))
                        # Ensure summaries are written to disk
                        writer.flush()
                        print("Data written to disk. Waiting for 5 seconds...")
                        time.sleep(1)
                    except ValueError as e:
                        print(f"Error processing {layer_name} for {device_type}: {e}")
                        continue  # Skip to the next device_type or layer_name
                      # Add a 2-second delay before generating new data

# Start generating and writing random data
generate_random_data()
