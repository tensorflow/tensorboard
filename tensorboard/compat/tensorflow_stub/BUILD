# Description:
# TensorBoard, a dashboard for investigating TensorFlow

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "all",
    srcs = glob(["*.py"]),
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)
