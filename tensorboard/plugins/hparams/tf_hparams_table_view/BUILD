load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_table_view",
    srcs = [
        "tf-hparams-table-view.html",
    ],
    path = "/tf-hparams-table-view",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:vaadin_grid",
        "//tensorboard/plugins/hparams/tf_hparams_session_group_details",
        "//tensorboard/plugins/hparams/tf_hparams_utils",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_hparams_table_view"],
    destdir = "tf-hparams-table-view",
    deps = [
        "//tensorboard/components/tf_imports:polymer_lib",
        "//tensorboard/components/tf_imports_google:lib",
        "//tensorboard/plugins/hparams/tf_hparams_session_group_details:legacy",
        "//tensorboard/plugins/hparams/tf_hparams_utils:legacy",
    ],
)
