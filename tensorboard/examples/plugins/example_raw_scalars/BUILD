# Description:
# TensorBoard example plugin

# This plugin is not primarily built with Bazel (intentionally, to
# demonstrate that Bazel is not required); we use this BUILD file only
# to define integration tests for TensorBoard itself.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

sh_test(
    name = "smoke_test",
    size = "large",
    timeout = "moderate",
    srcs = ["smoke_test.sh"],
    # Don't just `glob(["**"])` because `setup.py` creates artifacts
    # like wheels and a `tensorboard_plugin_example.egg-info` directory,
    # and we want to make sure that those don't interfere with the test.
    data = [
        "setup.py",
        "//tensorboard/pip_package",
    ] + glob([
        "tensorboard_plugin_example/*.py",
        "tensorboard_plugin_example/static/**",
    ]),
)

# TODO(luoe): this target fails because tf.summary.scalar is not defined.
# Investigate why.
# py_binary(
#     name = "raw_scalars_demo",
#     srcs = ["tensorboard_plugin_example/demo.py"],
#     main = "tensorboard_plugin_example/demo.py",
#     srcs_version = "PY2AND3",
#     deps = [
#         "//tensorboard:expect_tensorflow_installed",
#     ],
# )
