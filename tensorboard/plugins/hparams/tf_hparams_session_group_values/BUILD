load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_session_group_values",
    srcs = [
        "tf-hparams-session-group-values.html",
    ],
    path = "/tf-hparams-session-group-values",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/hparams/tf_hparams_table_view",
        "//tensorboard/plugins/hparams/tf_hparams_utils",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_hparams_session_group_values"],
    visibility = ["//visibility:public"],
    destdir = "tf-hparams-session-group-values",
    deps = [
        "//tensorboard/components/tf_imports:polymer_lib",
        "//tensorboard/plugins/hparams/tf_hparams_table_view:legacy",
        "//tensorboard/plugins/hparams/tf_hparams_utils:legacy",
    ],
)
