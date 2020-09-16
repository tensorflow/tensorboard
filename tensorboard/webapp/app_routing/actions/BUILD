load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "actions",
    srcs = [
        "app_routing_actions.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/app_routing:types",
        "@npm//@ngrx/store",
    ],
)
