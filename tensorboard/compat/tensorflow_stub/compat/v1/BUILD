package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "v1",
    srcs = glob(["*.py"]),
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard/compat/tensorflow_stub:errors",
    ],
)
