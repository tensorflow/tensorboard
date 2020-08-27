load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "tf_hparams_utils",
    srcs = [
        "tf-hparams-utils.ts",
    ],
    strict_checks = False,
    deps = [
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//lodash",
    ],
)

tf_ts_library(
    name = "hparams_split_layout",
    srcs = [
        "hparams-split-layout.ts",
    ],
    strict_checks = False,
    deps = [
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)

# Test disabled during migration to Polymer 3.

# tf_web_test(
#     name = "test",
#     src = "/tf-hparams-utils/test/tf-hparams-utils-test.html",
#     web_library = ":test_lib",
# )
#
# tf_web_library(
#     name = "test_lib",
#     testonly = 1,
#     srcs = [
#         "test/tf-hparams-utils-test.html",
#     ],
#     path = "/tf-hparams-utils",
#     deps = [
#         ":tf_hparams_utils",
#         "//tensorboard/components/tf_imports:d3",
#         "//tensorboard/components/tf_imports:polymer",
#         "//tensorboard/components/tf_imports:web_component_tester",
#     ],
# )
