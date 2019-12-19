package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")

licenses(["notice"])  # Apache 2.0

# TODO(cais): Consider replacing old debuger plugin with this before launch,
# instead of having two versions of debugger co-exist, which may be confusing to
# users.
ng_module(
    name = "debugger_v2",
    srcs = [
        "debugger_container.ts",
        "debugger_component.ts",
        "debugger_module.ts",
    ],
    assets = [
        "debugger_component.css",
        "debugger_component.ng.html",
    ],
    deps = [
        ":inactive",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

ng_module(
    name = "inactive",
    srcs = [
        "inactive_container.ts",
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
