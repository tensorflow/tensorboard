load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "custom_modal",
    srcs = [
        "custom_modal_component.ts",
        "custom_modal_module.ts",
    ],
    deps = [
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "custom_modal_test",
    testonly = True,
    srcs = [
        "custom_modal_test.ts",
    ],
    deps = [
        ":custom_modal",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
