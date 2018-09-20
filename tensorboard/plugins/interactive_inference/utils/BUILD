package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

py_library(
    name = "common_utils",
    srcs = ["common_utils.py"],
    srcs_version = "PY2AND3",
)

py_library(
    name = "platform_utils",
    srcs = ["platform_utils.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":common_utils",
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
        "//tensorboard:expect_tensorflow_installed",
        "@org_tensorflow_serving_api",
    ],
)

py_library(
    name = "test_utils",
    testonly = 1,
    srcs = ["test_utils.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:expect_tensorflow_installed",
    ],
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
        "@org_tensorflow_serving_api",
    ],
)
