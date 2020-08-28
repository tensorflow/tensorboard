load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "actions",
    srcs = [
        "index.ts",
        "text_actions.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/text_v2:types",
        "//tensorboard/webapp/plugins/text_v2/data_source",
        "//tensorboard/webapp/plugins/text_v2/store:types",
        "@npm//@ngrx/store",
    ],
)
