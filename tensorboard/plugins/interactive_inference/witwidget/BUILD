package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

py_library(
    name = "witwidget",
    srcs = glob([
        "__init__.py",
        "notebook/**/*.py",
    ]),
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:expect_absl_logging_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/plugins/interactive_inference/utils:inference_utils",
        "@com_google_protobuf//:protobuf_python",
        "@org_pythonhosted_six",
    ]
)

py_library(
    name = "version",
    srcs = ["version.py"],
    srcs_version = "PY2AND3",
)
