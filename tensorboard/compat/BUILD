# Description:
# TensorBoard, a dashboard for investigating TensorFlow

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "tensorflow",
    # This is a rule that checks whether TensorFlow is installed on
    # the system and falls back to tensorflow_stub if needed.
    srcs = ["__init__.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/compat/tensorflow_stub:all",
    ],
)

py_library(
    name = "no_tensorflow",
    # This is a rule that forces the use of tensorflow_stub instead of
    # a system install of TensorFlow even if it exists.
    srcs = [
      "notf.py",
    ],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":tensorflow",
    ],
)
