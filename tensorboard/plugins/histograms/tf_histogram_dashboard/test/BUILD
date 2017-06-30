package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:mocha_test.bzl", "mocha_test")

licenses(["notice"])  # Apache 2.0

# run :test_mocha_devserver to debug locally
mocha_test(
  name = "test",
    srcs = [
        "histogramTests.ts",
        "tests.html",
    ],
    path = "/tf-histogram-dashboard/test",
    test_file = "tests.html",
    deps = [
        "//tensorboard/plugins/histograms/tf_histogram_dashboard",
        "//tensorboard/components/tf_imports:d3",
    ],
    # TODO(@dandelionmane): Fix this failing test
    tags = ["manual"],
)
