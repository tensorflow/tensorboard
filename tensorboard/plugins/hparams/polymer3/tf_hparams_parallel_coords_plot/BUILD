load("//tensorboard/defs:defs.bzl", "tf_ts_library")
# load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_hparams_parallel_coords_plot",
    srcs = [
        "axes.ts",
        "interaction_manager.ts",
        "lines.ts",
        "tf-hparams-parallel-coords-plot.ts",
        "utils.d.ts",
        "utils.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/plugins/hparams:api_d_ts",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_query_pane:schema_d_ts",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_session_group_values",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_utils",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//lodash",
        "@npm//plottable",
    ],
)

# Test disabled during migration to Polymer 3.

# tf_web_test(
#     name = "test",
#     src = "/tf-hparams-parallel-coords-plot/test/tf-hparams-parallel-coords-plot-test.html",
#     web_library = ":test_lib",
# )
#
# tf_web_library(
#     name = "test_lib",
#     testonly = 1,
#     srcs = [
#         "test/tf-hparams-parallel-coords-plot-test.html",
#     ],
#     path = "/tf-hparams-parallel-coords-plot",
#     deps = [
#         ":tf_hparams_parallel_coords_plot",
#         "//tensorboard/components/tf_imports:d3",
#         "//tensorboard/components/tf_imports:polymer",
#         "//tensorboard/components/tf_imports:web_component_tester",
#     ],
# )
