load("//tensorboard/defs:defs.bzl", "tf_ts_library")
# load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "schema_d_ts",
    srcs = [
        "schema.d.ts",
    ],
)

tf_ts_library(
    name = "tf_hparams_query_pane",
    srcs = [
        "tf-hparams-query-pane.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/tf_backend",
        "//tensorboard/plugins/hparams/tf_hparams_utils",
        "//tensorboard/plugins/hparams/tf_hparams_utils:hparams_split_layout",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)

# Test disabled during migration to Polymer 3.

# tf_web_test(
#     name = "test",
#     src = "/tf-hparams-query-pane/test/tf-hparams-query-pane-test.html",
#     tags = ["manual"],
#     web_library = ":test_lib",
# )
#
# tf_web_library(
#     name = "test_lib",
#     testonly = 1,
#     srcs = [
#         "test/tf-hparams-query-pane-test.html",
#     ],
#     path = "/tf-hparams-query-pane",
#     deps = [
#         ":tf_hparams_query_pane",
#         "//tensorboard/components/tf_imports:polymer",
#         "//tensorboard/components/tf_imports:web_component_tester",
#         "//tensorboard/plugins/hparams/tf_hparams_backend",
#     ],
# )
