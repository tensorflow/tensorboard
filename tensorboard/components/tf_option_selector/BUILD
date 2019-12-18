load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_option_selector",
    srcs = ["tf-option-selector.ts"],
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
