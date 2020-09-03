load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "tf_hparams_session_group_details",
    srcs = [
        "tf-hparams-session-group-details.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_class",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/vz_chart_helpers",
        "//tensorboard/plugins/hparams/tf_hparams_utils",
        "//tensorboard/plugins/scalar/tf_scalar_dashboard:tf_scalar_card",
        "@npm//@polymer/decorators",
        "@npm//@polymer/iron-flex-layout",
        "@npm//@polymer/iron-resizable-behavior",
        "@npm//@polymer/polymer",
    ],
)
