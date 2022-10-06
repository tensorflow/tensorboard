FROM ubuntu:latest

# Install environment dependencies
RUN apt update && apt install -y git wget unzip python3 python3-pip python3-dev python-is-python3 default-jdk nodejs npm
RUN python3 -m pip install -U pip

# Setup build environment
ENV BAZEL_VERSION='4.0.0'
ENV BAZEL_SHA256SUM='7bee349a626281fc8b8d04a7a0b0358492712377400ab12533aeb39c2eb2b901'
ENV BUILDTOOLS_VERSION='3.0.0'
ENV BUILDIFIER_SHA256SUM='e92a6793c7134c5431c58fbc34700664f101e5c9b1c1fcd93b97978e8b7f88db'
ENV BUILDOZER_SHA256SUM='3d58a0b6972e4535718cdd6c12778170ea7382de7c75bc3728f5719437ffb84d'
ENV TENSORFLOW_VERSION='tf-nightly'

# Get the code
RUN git clone https://github.com/tensorflow/tensorboard /tensorboard
WORKDIR /tensorboard

# Install python dependencies
RUN pip install -r ./tensorboard/pip_package/requirements.txt -r ./tensorboard/pip_package/requirements_dev.txt && pip freeze --all

# Setup Bazel
RUN ci/download_bazel.sh "${BAZEL_VERSION}" "${BAZEL_SHA256SUM}" ~/bazel
RUN mv ~/bazel /usr/local/bin/bazel && chmod +x /usr/local/bin/bazel && cp ./ci/bazelrc ~/.bazelrc
RUN npm i -g @bazel/ibazel

# Install TensorFlow
RUN pip install "${TENSORFLOW_VERSION}"

# Fetch dependencies
RUN bazel fetch //tensorboard/...
