load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "data_source",
    srcs = [
        "npmi_data_source.ts",
        "npmi_data_source_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/webapp_data_source:http_client",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)
