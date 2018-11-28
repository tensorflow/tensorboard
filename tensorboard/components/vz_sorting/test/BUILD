package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("@io_bazel_rules_webtesting//web:py.bzl", "py_web_test_suite")

licenses(["notice"])  # Apache 2.0

py_web_test_suite(
    name = "test",
    srcs = ["test.py"],
    browsers = ["//tensorboard/functionaltests/browsers:chromium"],
    data = [
        ":test_web_library",
    ],
    srcs_version = "PY2AND3",
    deps = [
        "@io_bazel_rules_webtesting//testing/web",
        "//tensorboard/functionaltests:wct_test_driver",
    ],
)

tf_web_library(
    name = "test_web_library",
    srcs = [
        "sortingTests.ts",
        "tests.html",
    ],
    path = "/vz-sorting/test",
    deps = [
        "//tensorboard/components/tf_imports:web_component_tester",
        "//tensorboard/components/vz_sorting",
    ],
)
