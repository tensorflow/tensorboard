load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "runs",
    srcs = [
        "runs_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/runs/views/legacy_runs_selector",
        "@npm//@angular/core",
    ],
)
