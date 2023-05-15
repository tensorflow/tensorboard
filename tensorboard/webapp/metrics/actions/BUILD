load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "actions",
    srcs = [
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store:types",
        "//tensorboard/webapp/util:dom",
        "//tensorboard/webapp/widgets/card_fob:types",
        "//tensorboard/webapp/widgets/data_table:types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "@npm//@ngrx/store",
    ],
)
