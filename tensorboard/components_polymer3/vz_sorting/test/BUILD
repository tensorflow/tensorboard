load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")

package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

licenses(["notice"])  # Apache 2.0

tf_web_test(
    name = "test",
    src = "/vz-sorting/test/tests.html",
    tags = ["manual"],
    web_library = ":test_web_library",
)

tf_web_library(
    name = "test_web_library",
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
