load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "filter_input",
    srcs = [
        "filter_input_component.ts",
        "filter_input_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_autocomplete",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)
