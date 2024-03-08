# Description:
# Custom Plugin

# This plugin is not primarily built with Bazel (intentionally, to
# demonstrate that Bazel is not required); we use this BUILD file only
# to define integration tests for TensorBoard itself.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

sh_test(
    name = "custom_test",
    size = "large",
    timeout = "moderate",
    srcs = ["custom_test.sh"],
    # Don't just `glob(["**"])` because `setup.py` creates artifacts
    # like wheels and a `main_plugin.egg-info` directory,
    # and we want to make sure that those don't interfere with the test.
    data = [
        "setup.py",
        "//tensorboard/pip_package",
    ] + glob([
        "main_plugin/*.py",
        "main_plugin/static/**",
    ]),
    tags = [
        "manual",  # https://github.com/tensorflow/tensorboard/issues/2987
    ],
)
