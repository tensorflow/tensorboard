load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_hparams_dashboard",
    srcs = [
        "tf-hparams-dashboard.ts",
    ],
    strict_checks = False,
    deps = [
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/tf_backend",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_backend",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_main",
    ],
)
