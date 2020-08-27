load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

ng_module(
    name = "inactive",
    srcs = [
        "inactive_component.ts",
        "inactive_module.ts",
    ],
    assets = [
        "inactive_component.css",
        "inactive_component.ng.html",
    ],
    deps = [
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
