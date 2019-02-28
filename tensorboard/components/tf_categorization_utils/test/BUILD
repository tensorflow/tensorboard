package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")

licenses(["notice"])  # Apache 2.0

tf_web_test(
    name = "test",
    web_library = ":test_web_library",
    src = "/tf-categorization-utils/test/tests.html",
)

tf_web_library(
    name = "test_web_library",
    srcs = [
        "tests.html",
        "categorizationUtilsTests.ts",
    ],
    path = "/tf-categorization-utils/test",
    deps = [
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:web_component_tester",
        "//tensorboard/components/tf_imports:webcomponentsjs",
    ],
)

