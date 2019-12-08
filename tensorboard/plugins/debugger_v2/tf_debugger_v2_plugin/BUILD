package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")

licenses(["notice"])  # Apache 2.0

# TODO(cais): Consider replacing old debuger plugin with this before launch,
# instead of having two versions of debugger co-exist, which may be confusing to
# users.
ng_module(
    name = "debugger_v2",
    srcs = [
        "debugger.container.ts",
        "debugger.component.ts",
        "debugger.module.ts",
    ],
    assets = [
        "debugger.component.css",
        "debugger.component.html",
    ],
    deps = [
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
