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
        "//tensorboard:expect_tensorflow_installed",
        "@six_archive//:six",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["*"]),
    visibility = ["//third_party/tensorflow:__subpackages__"],
)
