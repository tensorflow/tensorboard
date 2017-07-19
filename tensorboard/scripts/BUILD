# Description:
# Some useful scripts that are bundled with TensorBoard.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_binary(
    name = "generate_testdata",
    srcs = ["generate_testdata.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
    ],
)

py_binary(
    name = "execrooter",
    srcs = ["execrooter.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
)
