package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")
load("//tensorboard/defs:defs.bzl", "tf_ts_library", "tf_js_binary")

licenses(["notice"])  # Apache 2.0

tf_web_test(
    name = "test",
    src = "/tf-plugin-lib/test/test.html",
    web_library = ":test_web_library",
)

tf_ts_library(
    name = "testable_plugin_lib_bundle",
    srcs = ["testable-plugin-lib.ts"],
    deps = [
        "//tensorboard/components/experimental/plugin_lib",
    ],
)

tf_js_binary(
    name = "testable_plugin_bundle",
    compile = 0,
    entry_point = "testable-plugin-lib.ts",
    deps = [
        ":testable_plugin_lib_bundle",
    ],
)

tf_web_library(
    name = "testable_plugin_lib",
    testonly = True,
    srcs = [
        "testable-iframe.html",
        "testable_plugin_bundle.js",
    ],
    path = "/tf-plugin-lib/test",
)

tf_web_library(
    name = "test_web_library",
    testonly = True,
    srcs = [
        "test.html",
        "test.ts",
    ],
    path = "/tf-plugin-lib/test",
    deps = [
        ":testable_plugin_lib",
        "//tensorboard/components/experimental/plugin_util:plugin_host",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:web_component_tester",
    ],
)
