load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.

tf_ts_library(
    name = "actions",
    srcs = [
        "npmi_actions.ts",
        "annotation_actions.ts",
        "metric_actions.ts",
        "result_actions.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/npmi/data_source",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "@npm//@ngrx/store",
    ],
)
