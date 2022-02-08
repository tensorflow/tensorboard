load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary")

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
