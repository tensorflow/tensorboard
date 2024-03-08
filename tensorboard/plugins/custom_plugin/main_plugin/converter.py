# import json
# import pandas as pd
# states = open('experiment-1.json')

# data = json.load(states)

# # for layer in data:
# print(data[0]["tensorflow.data.Dataset.from_tensor_slices((x_train, y_train)).shuffle(10000).batch()"]["energy_data"])

# # table_data = pd.DataFrame.from_dict(data[0]["tensorflow.data.Dataset.from_tensor_slices((x_train, y_train)).shuffle(10000).batch()"])

# # print(data[0]["tensorflow.data.Dataset.from_tensor_slices((x_train, y_train)).shuffle(10000).batch()"]["energy_data"]["cpu"])

# # print(table_data)
import os
import tensorflow as tf

def create_tensorboard_summary(energy_data):
    log_dir = "logs/system_performance"
    os.makedirs(log_dir, exist_ok=True)  # Create logs directory if not exists
    summary_writer = tf.summary.create_file_writer(log_dir)  # Create a summary writer

    with summary_writer.as_default():
        for component, data in energy_data.items():
            time_elapsed = data["time_elapsed"]
            energy_values = data["energy (J)"]

            for idx, energy in enumerate(energy_values):
                tf.summary.scalar(f"{component}/energy", energy, step=time_elapsed[idx])

    summary_writer.flush()

# Sample energy data
energy_data = {
    "cpu": {"time_elapsed": [0, 1, 2, 3, 4], "energy (J)": [1, 2, 3, 4, 5]},
    "ram": {"time_elapsed": [0, 1, 2, 3, 4], "energy (J)": [1, 2, 3, 4, 5]},
    "gpu": {"time_elapsed": [0, 1, 2, 3, 4], "energy (J)": [1, 2, 3, 4, 5]}
}

# Create TensorBoard summary
create_tensorboard_summary(energy_data)
