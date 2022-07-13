load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "actions",
    srcs = [
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/metrics:internal_types",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/util:dom",
        "//tensorboard/webapp/widgets/card_fob:types",
        "@npm//@ngrx/store",
    ],
)
