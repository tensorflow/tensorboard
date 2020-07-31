load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_main",
    srcs = ["tf-hparams-main.html"],
    path = "/tf-hparams-main",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:vaadin_split_layout",
        "//tensorboard/plugins/hparams/tf_hparams_query_pane",
        "//tensorboard/plugins/hparams/tf_hparams_sessions_pane",
    ],
)
