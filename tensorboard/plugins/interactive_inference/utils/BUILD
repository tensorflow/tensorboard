package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

py_library(
    name = "common_utils",
    srcs = ["common_utils.py"],
    srcs_version = "PY2AND3",
    deps = [
        "@org_tensorflow_serving_api",
    ],
)

py_library(
    name = "platform_utils",
    srcs = ["platform_utils.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":common_utils",
        "//tensorboard/util:tensor_util",
        "@org_tensorflow_serving_api",
    ],
)

py_library(
    name = "inference_utils",
    srcs = ["inference_utils.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":common_utils",
        ":platform_utils",
        "//tensorboard:expect_absl_logging_installed",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
        "@org_tensorflow_serving_api",
    ],
)

py_library(
    name = "test_utils",
    testonly = 1,
    srcs = ["test_utils.py"],
    srcs_version = "PY2AND3",
    deps = ["//tensorboard:expect_tensorflow_installed"],
)

py_test(
    name = "inference_utils_test",
    size = "small",
    srcs = ["inference_utils_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":common_utils",
        ":inference_utils",
        ":test_utils",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_mock",
        "@org_pythonhosted_six",
        "@org_tensorflow_serving_api",
    ],
)
