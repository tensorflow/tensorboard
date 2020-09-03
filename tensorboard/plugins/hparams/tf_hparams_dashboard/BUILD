load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_hparams_dashboard",
    srcs = [
        "tf-hparams-dashboard.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/tf_backend",
        "//tensorboard/plugins/hparams/tf_hparams_backend",
        "//tensorboard/plugins/hparams/tf_hparams_main",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
