load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary")

package(default_visibility = ["//tensorboard/webapp/notification_center:__subpackages__"])

licenses(["notice"])

tf_sass_binary(
    name = "notification_center_styles",
    src = "notification_center_component.scss",
)

tf_ng_module(
    name = "_views",
    srcs = [
        "notification_center_component.ts",
        "notification_center_container.ts",
        "view_types.ts",
        "views_module.ts",
    ],
    assets = [
        ":notification_center_styles",
        "notification_center_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/notification_center/_redux:types",
        "@npm//@angular/core",
    ],
)
