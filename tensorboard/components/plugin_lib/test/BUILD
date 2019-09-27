package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "test",
    testonly = True,
    srcs = [
        "test.html",
        "test.ts",
        "testable-iframe.html",
    ],
    path = "/tf-plugin-lib/test",
    deps = [
        "//tensorboard/components/plugin_lib",
        "//tensorboard/components/plugin_lib:host_impls",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:web_component_tester",
    ],
)
