load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_dashboard",
    srcs = [
        "tf-hparams-dashboard.html",
    ],
    path = "/tf-hparams-dashboard",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_tensorboard:plugin_dialog",
        "//tensorboard/plugins/hparams/tf_hparams_backend",
        "//tensorboard/plugins/hparams/tf_hparams_main",
    ],
)
