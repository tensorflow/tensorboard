load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_runs_selector",
    srcs = [
        "tf-runs-selector.ts",
        "tf-wbr-string.ts",
    ],
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_storage",
        "@npm//@polymer/decorators",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-dialog",
        "@npm//@polymer/paper-styles",
        "@npm//@polymer/polymer",
    ],
)
