FROM ubuntu:latest

# Install environment dependencies
RUN apt update && apt install -y wget unzip python3 python3-pip python3-dev python-is-python3 default-jdk nodejs npm
RUN python3 -m pip install -U pip

# Setup build environment
ENV BAZEL_VERSION='4.2.2'
ENV BAZEL_SHA256SUM='11dea6c7cfd866ed520af19a6bb1d952f3e9f4ee60ffe84e63c0825d95cb5859'
ENV BUILDTOOLS_VERSION='3.0.0'
ENV BUILDIFIER_SHA256SUM='e92a6793c7134c5431c58fbc34700664f101e5c9b1c1fcd93b97978e8b7f88db'
ENV BUILDOZER_SHA256SUM='3d58a0b6972e4535718cdd6c12778170ea7382de7c75bc3728f5719437ffb84d'
ENV TENSORFLOW_VERSION='tf-nightly'

RUN mkdir /tensorboard
WORKDIR /tensorboard

# Setup Bazel
COPY ./ci /tensorboard/ci
RUN ci/download_bazel.sh "${BAZEL_VERSION}" "${BAZEL_SHA256SUM}" ~/bazel
RUN mv ~/bazel /usr/local/bin/bazel && chmod +x /usr/local/bin/bazel && cp ./ci/bazelrc ~/.bazelrc
RUN npm i -g @bazel/ibazel

# Install python dependencies
COPY ./tensorboard/pip_package /tensorboard/tensorboard/pip_package
RUN pip install -r ./tensorboard/pip_package/requirements.txt -r ./tensorboard/pip_package/requirements_dev.txt "$TENSORFLOW_VERSION" && pip freeze --all

# Get the code
COPY . /tensorboard

# Fetch dependencies
RUN bazel fetch //tensorboard/...
