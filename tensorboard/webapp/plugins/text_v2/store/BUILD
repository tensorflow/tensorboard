load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

#ng_module(
#name = "store",
#srcs = [
#"text_reducers.ts",
#"text_selectors.ts",
#"text_store_utils.ts",
#"index.ts",
#],
#deps = [
#":text_store_helpers",
#":types",
#"//tensorboard/plugins/text_v2/actions",
#"//tensorboard/plugins/text_v2/data_source",
#"@npm//@ngrx/store",
#],
#)

ng_module(
    name = "types",
    srcs = [
        "text_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/types",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
