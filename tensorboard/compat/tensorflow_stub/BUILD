# Description:
# TensorBoard, a dashboard for investigating TensorFlow

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "tensorflow_stub",
    srcs = glob([
        "*.py",
        "compat/__init__.py",
        "compat/v1/__init__.py",
    ]),
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard:expect_absl_flags_installed",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "@org_pythonhosted_six",
    ],
)
