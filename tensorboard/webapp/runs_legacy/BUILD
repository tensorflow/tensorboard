load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "runs_legacy",
    srcs = [
        "runs_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/runs_legacy/views/legacy_runs_selector",
        "@npm//@angular/core",
    ],
)
