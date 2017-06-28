package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")
load("//tensorboard/defs:web.bzl", "ts_web_library")
load("@io_bazel_rules_webtesting//web:py.bzl", "py_web_test_suite")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "test",
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

tensorboard_html_binary(
    name = "devserver",
    compilation_level = "WHITESPACE_ONLY",
    input_path = "/vz-sorting/test/tests.html",
    output_path = "/vz-sorting/test/tests.html",
    deps = [":test"],
)

py_web_test_suite(
    name = "driver",
    srcs = ["driver.py"],
    browsers = ["//tensorboard/functionaltests/browsers:chromium"],
    data = [
        ":devserver",
    ],
    srcs_version = "PY2AND3",
    deps = ["@io_bazel_rules_webtesting//testing/web"],
)
