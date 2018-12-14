package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "compat",
    srcs = ["__init__.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:expect_numpy_installed",
        "//tensorboard/compat/tensorflow_stub/compat/v1",
        "@org_pythonhosted_six",
    ],
)
