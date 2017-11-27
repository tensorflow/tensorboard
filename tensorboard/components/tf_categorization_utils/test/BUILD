package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "test",
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

