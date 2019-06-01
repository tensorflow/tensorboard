package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

tf_web_test(
    name = "test",
    web_library = ":test_web_library",
    src = "/tf-plugin/test/test_binary.html"
)

# HACK: specifying tensorboard_html_binary on tf_web_test causes certain
# environment to throw exception but wrapping tensorbard_html_binary with
# tf_web_library seems to be okay.
tf_web_library(
    name = "test_web_library",
    srcs = [
        ":test_binary.html",
    ],
    path = "/tf-plugin/test",
    deps = [
        ":test_lib",
        "//tensorboard/components/tf_imports:web_component_tester",
    ],
)

tensorboard_html_binary(
    name = "test_binary",
    # Disable advanced optimization to prevent check for WebComponentTester
    # gobals.
    compilation_level = "SIMPLE",
    # Requires for compiling `import`s away.
    compile = True,
    input_path = "/tf-plugin/test/tests.html",
    output_path = "/tf-plugin/test/test_binary.html",
    deps = [
        ":test_lib",
    ],
)

tf_web_library(
    name = "test_lib",
    srcs = [
        "iframe.html",
        "iframe.ts",
        "plugin-test.ts",
        "tests.html",
    ],
    path = "/tf-plugin/test",
    deps = [
        "//tensorboard/components/plugin_util:plugin_host",
        "//tensorboard/components/plugin_util:plugin_guest",
        "//tensorboard/components/tf_imports:web_component_tester",
    ],
)
