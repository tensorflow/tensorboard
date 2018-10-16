# TensorFlow Protos

Protobuf files copied from the main TensorFlow repository and used in the case of tensorboard-notf, which builds without a TensorFlow dependency.

## Update process

Copy the proto files from TensorFlow to TensorBoard using the following process:

* git clone tensorflow/tensorboard and tensorflow/tensorboard in ~
* cd ~/tensorboard
* ./tensorboard/compat/proto/update.sh
* git add .
* git commit -m "Update TensorFlow protos to xxxx"

These were taken from TensorFlow version 1.12.0-dev20181012
