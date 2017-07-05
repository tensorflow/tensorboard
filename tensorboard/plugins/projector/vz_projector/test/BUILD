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
        "assert.ts",
        "data-provider_test.ts",
        "data_test.ts",
        "sptree_test.ts",
        "tests.html",
        "util_test.ts",
        # "scatterPlotRectangleSelector_test.ts",
        # "vz-projector-projections-panel_test.ts",
    ],
    test_file = "tests.html",
    path = "/vz-projector/test",
    deps = [
        "//tensorboard/plugins/projector/vz_projector",
    ],
)

