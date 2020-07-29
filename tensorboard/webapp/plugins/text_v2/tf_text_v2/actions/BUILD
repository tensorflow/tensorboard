load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.

tf_ts_library(
    name = "actions",
    srcs = [
        "text_actions.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/text_v2/tf_text_v2/data_source",
        "//tensorboard/webapp/plugins/text_v2/tf_text_v2/store:types",
        "@npm//@ngrx/store",
    ],
)

