# Description:
# Compatibility interfaces for TensorBoard.
load("@rules_python//python:py_library.bzl", "py_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

# Compatibility helpers in the `tensorboard.compat` module.
#
# This module provides aliases for importing variations on the TensorFlow APIs.
#
# `from tensorboard.compat import tf`: this provides the TF API. By default
# this will try to `import tensorflow` and if it fails, will be undefined. This
# is useful primarily in combination with the `:tensorflow` rule below.
#
# `from tensorboard.compat import tf_v2`: this provides the TF 2.0 API. By
# default this tries to import the TF 2.0 API from a few places where it may
# be accessible, and if it fails, will be undefined.
py_library(
    name = "compat",
    srcs = ["__init__.py"],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard:lazy",
    ],
)

# This rule ensures that `from tensorboard.compat import tf` will provide a
# TensorFlow API. By default this API implementation uses actual TensorFlow if
# available, and if not falls back to a stub implementation.
#
# Depend on this rule if your code is usable with either real or stub TF.
#
# External only: targets that need real TF should instead depend on the
# placeholder rule //tensorboard:expect_tensorflow_installed, which is a no-op
# as written but can be swapped out for a real dependency.
py_library(
    name = "tensorflow",
    srcs_version = "PY3",
    deps = [
        ":compat",
        "//tensorboard/compat/tensorflow_stub",
    ],
)

# Like :tensorflow, but doesn't use actual TensorFlow even if available.
#
# Depend on this rule if your code should only use the TF stub.
py_library(
    name = "no_tensorflow",
    srcs = ["notf.py"],
    srcs_version = "PY3",
    deps = [
        ":tensorflow",
    ],
)

genrule(
    name = "gen_notf",
    outs = ["notf.py"],
    cmd = "touch $(location notf.py)",
)
