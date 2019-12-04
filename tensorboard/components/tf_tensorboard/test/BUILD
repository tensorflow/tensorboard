package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")

licenses(["notice"])  # Apache 2.0

tf_web_test(
    name = "test",
    src = "/tf-tensorboard/test/tests.html",
    web_library = ":test_web_library",
)

tf_web_library(
    name = "test_web_library",
    srcs = [
        "autoReloadTests.ts",
        "tensorboardTests.ts",
        "tests.html",
    ],
    path = "/tf-tensorboard/test",
    deps = [
        "//tensorboard/components:analytics",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:web_component_tester",
        "//tensorboard/components/tf_tensorboard",
    ],
)
