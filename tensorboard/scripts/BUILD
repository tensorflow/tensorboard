# Description:
# Some useful scripts that are bundled with TensorBoard.

package(default_visibility = ["//third_party/tensorflow:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_binary(
    name = "generate_testdata",
    srcs = ["generate_testdata.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:expect_numpy_installed",
        "//third_party/tensorflow/core:protos_all_py",
        "//third_party/tensorflow/python",  # TODO(b/34059704): remove when fixed
        "//third_party/tensorflow/python:array_ops",
        "//third_party/tensorflow/python:client",
        "//third_party/tensorflow/python:logging_ops",
        "//third_party/tensorflow/python:platform",
        "//third_party/tensorflow/python:summary",
        "@six_archive//:six",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["*"]),
    visibility = ["//third_party/tensorflow:__subpackages__"],
)
