import math

from absl import app
import tensorflow as tf
from tensorboard.plugins.hparams import api as hp


def main(unused_argv):
    summary_writer = tf.summary.create_file_writer("logs/fake_bert")
    for step in range(10):

        loss = tf.random.uniform([], minval=0.1, maxval=1.0)
        accuracy = tf.random.uniform([], minval=0.7, maxval=0.9)

        with summary_writer.as_default():
            tf.summary.scalar("loss", loss, step=step)
            tf.summary.scalar("accuracy", accuracy, step=step)

    hparams = {
        "learning_rate": 0.001,
        "batch_size": 32,
        "num_layers": 6,
        "num_heads": 8,
    }

    with summary_writer.as_default():
        hp.hparams(hparams)


if __name__ == "__main__":
    app.run(main)

# from absl import app
# import tensorflow as tf

# from main_plugin import summary_v2
# import os

# # Sample energy data
# energy_data = {
#     "cpu": {"time_elapsed": [0, 1, 2, 3, 4], "energy (J)": [1, 2, 3, 4, 5]},
#     "ram": {"time_elapsed": [0, 1, 2, 3, 4], "energy (J)": [1, 2, 3, 4, 5]},
#     "gpu": {"time_elapsed": [0, 1, 2, 3, 4], "energy (J)": [1, 2, 3, 4, 5]}
# }

# def main(unused_argv):
#     log_dir = "logs/system_performance"
#     os.makedirs(log_dir, exist_ok=True)  # Create logs directory if not exists
#     summary_writer = tf.summary.create_file_writer(log_dir)  # Create a summary writer

#     with summary_writer.as_default():
#         summary_v2.mydata(energy_data)

# if __name__ == "__main__":
#     app.run(main)