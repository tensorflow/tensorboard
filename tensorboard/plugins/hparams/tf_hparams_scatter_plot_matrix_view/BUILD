load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")
load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_scatter_plot_matrix_view",
    srcs = [
        "tf-hparams-scatter-plot-matrix-view.html",
    ],
    path = "/tf-hparams-scatter-plot-matrix-view",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:vaadin_split_layout",
        "//tensorboard/plugins/hparams/tf_hparams_scale_and_color_controls",
        "//tensorboard/plugins/hparams/tf_hparams_scatter_plot_matrix_plot",
        "//tensorboard/plugins/hparams/tf_hparams_session_group_details",
        "//tensorboard/plugins/hparams/tf_hparams_session_group_values",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_hparams_scatter_plot_matrix_view"],
    destdir = "tf-hparams-scatter-plot-matrix-view",
    deps = [
        "//tensorboard/components/tf_imports:polymer_lib",
        "//tensorboard/components/tf_imports_google:lib",
        "//tensorboard/plugins/hparams/tf_hparams_scale_and_color_controls:legacy",
        "//tensorboard/plugins/hparams/tf_hparams_scatter_plot_matrix_plot:legacy",
        "//tensorboard/plugins/hparams/tf_hparams_session_group_details:legacy",
        "//tensorboard/plugins/hparams/tf_hparams_session_group_values:legacy",
    ],
)
