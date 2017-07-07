package(default_visibility = ["//tensorboard:internal"])

load("@io_bazel_rules_webtesting//web:py.bzl", "py_web_test_suite")

licenses(["notice"])

py_web_test_suite(
    name = "core_test",
    srcs = ["core_test.py"],
    browsers = ["//tensorboard/functionaltests/browsers:chromium"],
    data = [
        "//tensorboard",
    ],
    srcs_version = "PY2AND3",
    deps = [
        "@io_bazel_rules_webtesting//testing/web",
        "//tensorboard/plugins/scalar:scalars_demo",
        "//tensorboard/plugins/audio:audio_demo",
    ],
)
