# Description:
# Compatibility interfaces for TensorBoard.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

# This rule provides a TensorFlow API implementation exposed under
# `tensorboard.compat.tensorflow`. By default this API implementation
# uses actual TensorFlow if available, and if not falls back to our stub.
#
# Depend on this rule if your code is usable with either real or stub TF.
#
# Note that this rule doesn't actually *provide* the TensorFlow dependency; this
# can be separately expressed using //tensorboard:expect_tensorflow_installed,
# which is a no-op as written but can be swapped out for a real dependency.
py_library(
    name = "tensorflow",
    srcs = ["__init__.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/compat/tensorflow_stub",
    ],
)

# Like :tensorflow, but doesn't use actual TensorFlow even if available.
#
# Depend on this rule if your code should only use the TF stub.
py_library(
    name = "no_tensorflow",
    srcs = ["notf.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":tensorflow",
    ],
)

genrule(
    name = "gen_notf",
    outs = ["notf.py"],
    cmd = "touch $(location notf.py)",
)
