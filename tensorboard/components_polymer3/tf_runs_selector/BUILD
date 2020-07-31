load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_runs_selector",
    srcs = ["tf-runs-selector.ts"],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/tf_backend",
        "//tensorboard/components_polymer3/tf_color_scale",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/components_polymer3/tf_storage",
        "//tensorboard/components_polymer3/tf_wbr_string",
        "@npm//@polymer/decorators",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-dialog",
        "@npm//@polymer/polymer",
    ],
)
