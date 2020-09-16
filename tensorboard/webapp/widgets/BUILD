load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

ng_module(
    name = "resize_detector",
    srcs = [
        "resize_detector_directive.ts",
        "resize_detector_module.ts",
    ],
    deps = [
        "@npm//@angular/core",
        "@npm//@types/resize-observer-browser",
        "@npm//rxjs",
    ],
)

ng_module(
    name = "resize_detector_test",
    testonly = True,
    srcs = [
        "resize_detector_test.ts",
    ],
    deps = [
        ":resize_detector",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
        "@npm//@types/resize-observer-browser",
    ],
)

ng_module(
    name = "resize_detector_testing",
    testonly = True,
    srcs = [
        "resize_detector_testing_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
    ],
)

ng_module(
    name = "smart_date",
    srcs = [
        "smart_date_component.ts",
        "smart_date_module.ts",
    ],
    assets = [
        "smart_date_component.ng.html",
    ],
    deps = [
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

ng_module(
    name = "smart_date_test",
    testonly = True,
    srcs = [
        "smart_date_test.ts",
    ],
    deps = [
        ":smart_date",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@types/jasmine",
    ],
)

tf_sass_binary(
    name = "list_view_styles",
    src = "list_view_component.scss",
)

ng_module(
    name = "list_view",
    srcs = [
        "list_view_component.ts",
        "list_view_module.ts",
        "list_view_types.ts",
    ],
    assets = [
        ":list_view_styles",
        "list_view_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_expansion",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/angular:expect_angular_material_sort",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

ng_module(
    name = "list_view_test",
    testonly = True,
    srcs = [
        "list_view_test.ts",
    ],
    deps = [
        ":list_view",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/angular:expect_angular_material_expansion",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/angular:expect_angular_material_sort",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
