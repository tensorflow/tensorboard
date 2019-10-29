package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")

licenses(["notice"])  # Apache 2.0

tf_web_test(
    name = "test",
    src = "/tf-plugin-util/test/tests.html",
    web_library = ":test_web_library",
)

tf_web_library(
    name = "test_web_library",
    srcs = [
        "plugin-test.ts",
        "tests.html",
    ],
    path = "/tf-plugin-util/test",
    deps = [
        "//tensorboard/components/experimental/plugin_lib/test:testable_plugin_lib",
        "//tensorboard/components/experimental/plugin_util:plugin_host",
        "//tensorboard/components/tf_imports:web_component_tester",
    ],
)
