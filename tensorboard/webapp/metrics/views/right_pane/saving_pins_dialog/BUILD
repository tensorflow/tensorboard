load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "saving_pins_dialog_component_styles",
    src = "saving_pins_dialog_component.scss",
)

tf_ng_module(
    name = "saving_pins_dialog",
    srcs = [
        "saving_pins_dialog_component.ts",
        "saving_pins_dialog_module.ts",
    ],
    assets = [
        ":saving_pins_dialog_component_styles",
        "saving_pins_dialog_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_dialog",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "saving_pins_dialog_test",
    testonly = True,
    srcs = ["saving_pins_dialog_test.ts"],
    deps = [
        ":saving_pins_dialog",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_dialog",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
