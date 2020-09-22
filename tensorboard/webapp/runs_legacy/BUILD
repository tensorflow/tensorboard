load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "runs_legacy",
    srcs = [
        "runs_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/runs_legacy/views/legacy_runs_selector",
        "@npm//@angular/core",
    ],
)
