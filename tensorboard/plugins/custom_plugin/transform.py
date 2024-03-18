import json
import tensorflow as tf
import numpy as np

log_path = "main_plugin/logs/system_performance"

writer = tf.summary.create_file_writer(log_path)


def collect_data_from_json_file(json_file):
    with open("./main_plugin/"+json_file, 'r') as f:
        json_data = json.load(f)
        print(json_data)
    
    collected_data = []
    for layer_data in json_data:
        for layer_name, data in layer_data.items():
            energy_data = data.get('energy_data', {})
            cpu_data = json.loads(energy_data.get('cpu', '{}'))
            ram_data = json.loads(energy_data.get('ram', '{}'))
            gpu_data = json.loads(energy_data.get('gpu', '{}'))
            print(cpu_data)
            print(ram_data)
            print(gpu_data)

            with writer.as_default():
                for device_type, data in [('CPU', cpu_data), ('RAM', ram_data), ('GPU', gpu_data)]:
                    print(device_type, data)

                    try:
                        times, energies = zip(*data["data"])
                        print(times, energies)
                        for time_point, energy in zip(times, energies):
                            tf.summary.scalar(f"{layer_name}/{device_type} Energy (J)",
                                            energy,
                                            step=int(time_point*1000))
                            # Ensure summaries are written to disk
                            writer.flush()
                    except:
                        print(f"Error processing {layer_name}")
                        # print(f"Data: {device_data['data']}")
                        continue  # Skip to the next device_type or layer_name

# Provide the path to your JSON file
json_file_path = 'small_sample.json'

# Collect data from JSON file
collected_data = collect_data_from_json_file(json_file_path)

print(collected_data)
