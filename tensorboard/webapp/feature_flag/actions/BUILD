load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "actions",
    srcs = [
        "feature_flag_actions.ts",
    ],
    deps = [
        "//tensorboard/webapp/feature_flag:types",
        "@npm//@ngrx/store",
    ],
)
