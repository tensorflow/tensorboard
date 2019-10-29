load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")
load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_parallel_coords_plot",
    srcs = [
        "axes.ts",
        "interaction_manager.ts",
        "lines.ts",
        "tf-hparams-parallel-coords-plot.html",
        "utils.d.ts",
        "utils.html",
    ],
    path = "/tf-hparams-parallel-coords-plot",
    deps = [
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/hparams:api_d_ts",
        "//tensorboard/plugins/hparams/tf_hparams_query_pane:schema_d_ts",
        "//tensorboard/plugins/hparams/tf_hparams_session_group_values",
        "//tensorboard/plugins/hparams/tf_hparams_utils",
    ],
)

tf_web_test(
    name = "test",
    src = "/tf-hparams-parallel-coords-plot/test/tf-hparams-parallel-coords-plot-test.html",
    web_library = ":test_lib",
)

tf_web_library(
    name = "test_lib",
    testonly = 1,
    srcs = [
        "test/tf-hparams-parallel-coords-plot-test.html",
    ],
    path = "/tf-hparams-parallel-coords-plot",
    deps = [
        ":tf_hparams_parallel_coords_plot",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:web_component_tester",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_hparams_parallel_coords_plot"],
    destdir = "tf-hparams-parallel-coords-plot",
    deps = [
        "//tensorboard/components/tf_imports:polymer_lib",
        "//tensorboard/components/tf_imports_google:lib",
        "//tensorboard/plugins/hparams/tf_hparams_session_group_values:legacy",
        "//tensorboard/plugins/hparams/tf_hparams_utils:legacy",
    ],
)
