load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "actions",
    srcs = [
        "feature_flag_actions.ts",
    ],
    deps = [
        "//tensorboard/webapp/feature_flag:types",
        "//tensorboard/webapp/feature_flag/store:types",
        "@npm//@ngrx/store",
    ],
)
