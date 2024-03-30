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
            time_data = data.get('times',{})
            cpu_data = json.loads(energy_data.get('cpu', '{}'))
            ram_data = json.loads(energy_data.get('ram', '{}'))
            gpu_data = json.loads(energy_data.get('gpu', '{}'))

            # print(cpu_data)
            # print(ram_data)
            # print(gpu_data)

            start_time_execution = time_data.get('start_time_execution')
            end_time_execution = time_data.get('end_time_execution')

            with writer.as_default():

                if start_time_execution and end_time_execution:
                    tf.summary.scalar(f"{layer_name}/start_time_execution",
                                      float(start_time_execution),
                                      step=0)
                    tf.summary.scalar(f"{layer_name}/end_time_execution",
                                      float(end_time_execution),
                                      step=0)

                for device_type, data in [('CPU', cpu_data), ('RAM', ram_data), ('GPU', gpu_data)]:
                    print(device_type, data)

                    

                    try:
                        times, energies = zip(*data["data"])
                        # print(times, energies)
                        for time_point, energy in zip(times, energies):
                            tf.summary.scalar(f"{layer_name}/{device_type}",
                                            energy,
                                            step=int(time_point*1000000000))
                            # Ensure summaries are written to disk
                            writer.flush()
                    except:

                        try:
                            if(device_type == 'GPU'):
                                timestamps, powers, times, temprature = zip(*data["data"])
                                for tstamp, energy, time_point, temp in zip(timestamps, powers, times, temprature):
                                    tf.summary.scalar(f"{layer_name}/{device_type}/temperature",
                                                temp,
                                                step=int(tstamp))
                                    tf.summary.scalar(f"{layer_name}/{device_type}/energy",
                                            energy,
                                            step=int(tstamp*1000000000))

                                    # Ensure summaries are written to disk
                                    writer.flush()
                        except ValueError as e:
                                                            # Ensure summaries are written to disk
                            print(f"Error processing {layer_name}")
                        # print(f"Data: {device_data['data']}")
                        continue  # Skip to the next device_type or layer_name

# Provide the path to your JSON file
json_file_path = 'large_sample.json'

# Collect data from JSON file
collected_data = collect_data_from_json_file(json_file_path)

print(collected_data)
