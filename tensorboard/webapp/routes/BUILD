load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "routes",
    srcs = [
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/app_routing:route_config",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/tb_wrapper",
        "@npm//@angular/core",
    ],
)
