load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "data_source",
    srcs = [
        "tftext2_data_source.ts",
        "tftext2_data_source_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/text_v2/tf_text_v2/store:types",
        "//tensorboard/webapp/webapp_data_source:http_client",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

