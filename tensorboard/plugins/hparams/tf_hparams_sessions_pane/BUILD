load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_sessions_pane",
    srcs = [
        "tf-hparams-sessions-pane.html",
    ],
    path = "/tf-hparams-sessions-pane",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/hparams/tf_hparams_parallel_coords_view",
        "//tensorboard/plugins/hparams/tf_hparams_scatter_plot_matrix_view",
        "//tensorboard/plugins/hparams/tf_hparams_table_view",
        "@org_polymer_iron_pages",
        "@org_polymer_paper_button",
        "@org_polymer_paper_header_panel",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_tabs",
        "@org_polymer_paper_toolbar",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_hparams_sessions_pane"],
    destdir = "tf-hparams-sessions-pane",
    deps = [
        "//tensorboard/components/tf_imports:polymer_lib",
        "//tensorboard/plugins/hparams/tf_hparams_parallel_coords_view:legacy",
        "//tensorboard/plugins/hparams/tf_hparams_scatter_plot_matrix_view:legacy",
        "//tensorboard/plugins/hparams/tf_hparams_table_view:legacy",
        "//third_party/javascript/polymer/v2/iron-pages:lib",
        "//third_party/javascript/polymer/v2/paper-button:lib",
        "//third_party/javascript/polymer/v2/paper-header-panel:lib",
        "//third_party/javascript/polymer/v2/paper-icon-button:lib",
        "//third_party/javascript/polymer/v2/paper-tabs:lib",
        "//third_party/javascript/polymer/v2/paper-toolbar:lib",
    ],
)
