# Description:
# TensorBoard, a dashboard for investigating TensorFlow

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "tensorflow_stub",
    srcs = [
        "__init__.py",
        "app.py",
        "dtypes.py",
        "flags.py",
        "gfile.py",
        "pywrap_tensorflow.py",
        "tensor_shape.py",
    ],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":errors",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/compat/tensorflow_stub/compat",
    ],
)

py_library(
    name = "errors",
    srcs = [
        "error_codes.py",
        "errors.py",
    ],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)
