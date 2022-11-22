load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "settings_link_converter",
    srcs = [
        "_settings_link_converter_module.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/settings_link_converter/_redux:actions",
        "//tensorboard/webapp/settings_link_converter/_redux:types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)
