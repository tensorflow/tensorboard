load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "store",
    srcs = [
        "npmi_reducers.ts",
        "npmi_selectors.ts",
        "index.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/plugins/npmi/actions",
        "//tensorboard/webapp/plugins/npmi/data_source",
        "@npm//@ngrx/store",
    ],
)

ng_module(
    name = "types",
    srcs = [
        "npmi_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/types",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
