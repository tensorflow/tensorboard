import tensorflow.compat.v2 as tf
from tensorboard.compat.proto import summary_pb2

from main_plugin import metadata


def mydata(mydata,description="My data"):

    create_tensorboard_summary(mydata)
        
    with tf.summary.experimental.summary_scope("Flop Calculation") as (tag, _):
        return tf.summary.write(
            tag=tag,
            tensor=tf.strings.join(["Hello, ", guest, "!"]),
            step=step,
            metadata=_create_summary_metadata(description),
        )


def _create_summary_metadata(description):
    return summary_pb2.SummaryMetadata(
        summary_description=description,
        plugin_data=summary_pb2.SummaryMetadata.PluginData(
            plugin_name=metadata.PLUGIN_NAME,
            content=b"",  # no need for summary-specific metadata
        ),
        data_class=summary_pb2.DATA_CLASS_TENSOR,
    )

import os

def create_tensorboard_summary(energy_data):
    

    with summary_writer.as_default():
        for component, data in energy_data.items():
            time_elapsed = data["time_elapsed"]
            energy_values = data["energy (J)"]

            for idx, energy in enumerate(energy_values):
                tf.summary.scalar(f"{component}/energy", energy, step=time_elapsed[idx])

    summary_writer.flush()

