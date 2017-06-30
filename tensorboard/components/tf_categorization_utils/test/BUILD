package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:mocha_test.bzl", "mocha_test")

licenses(["notice"])  # Apache 2.0

mocha_test(
    name = "test",
    srcs = [
        "tests.html",
        "categorizationUtilsTests.ts",
    ],
    test_file = "tests.html",
    path = "/tf-categorization-utils/test",
    deps = [
        "//tensorboard/components/tf_categorization_utils",
    ],
)

