# remove later
bazel clean
pip uninstall tensorboard -y
rm -rf /tmp/tensorboard/
bazel run //tensorboard/pip_package:build_pip_package
pip install /tmp/tensorboard/dist/tensorboard-1.13.0a0-py3-none-any.whl

