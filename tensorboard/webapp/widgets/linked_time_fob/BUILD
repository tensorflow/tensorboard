load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "linked_time_fob_styles",
    src = "linked_time_fob_component.scss",
    deps = ["//tensorboard/webapp:angular_material_sass_deps"],
)

tf_sass_binary(
    name = "linked_time_fob_controller_styles",
    src = "linked_time_fob_controller_component.scss",
    deps = ["//tensorboard/webapp:angular_material_sass_deps"],
)

tf_ng_module(
    name = "linked_time_fob",
    srcs = [
        "linked_time_fob_component.ts",
        "linked_time_fob_controller_component.ts",
        "linked_time_fob_module.ts",
    ],
    assets = [
        "linked_time_fob_controller_component.ng.html",
        "linked_time_fob_component.ng.html",
        ":linked_time_fob_styles",
        ":linked_time_fob_controller_styles",
    ],
    deps = [
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/third_party:d3",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "linked_time_fob_test",
    testonly = True,
    srcs = [
        "linked_time_fob_test.ts",
    ],
    deps = [
        ":linked_time_fob",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/testing:dom",
        "//tensorboard/webapp/third_party:d3",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
