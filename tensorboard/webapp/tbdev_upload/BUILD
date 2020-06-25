load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "tbdev_upload",
    srcs = [
        "tbdev_upload_dialog_component.ts",
        "tbdev_upload_button_component.ts",
        "tbdev_upload_module.ts",
    ],
    assets = [
        "tbdev_upload_dialog_component.css",
        "tbdev_upload_dialog_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_dialog",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/core",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)
