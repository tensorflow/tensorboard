load("//tensorboard/defs:defs.bzl", "tf_ts_library")
load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "effects",
    srcs = [
        "text_effects.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/text_v2/tf_text_v2/actions",
        "//tensorboard/webapp/plugins/text_v2/tf_text_v2/data_source",
        "//tensorboard/webapp/plugins/text_v2/tf_text_v2/store:types",
        "//tensorboard/webapp/core/actions",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

