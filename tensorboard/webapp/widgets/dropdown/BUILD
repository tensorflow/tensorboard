load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "dropdown_styles",
    src = "dropdown_component.scss",
)

tf_ng_module(
    name = "dropdown",
    srcs = [
        "dropdown_component.ts",
        "dropdown_module.ts",
    ],
    assets = [
        ":dropdown_styles",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_select",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)
