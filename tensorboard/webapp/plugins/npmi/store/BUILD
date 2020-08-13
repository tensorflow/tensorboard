load("//tensorboard/defs:defs.bzl", "tf_ts_library")
load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "store",
    srcs = [
        "index.ts",
        "npmi_reducers.ts",
        "npmi_selectors.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/plugins/npmi/actions",
        "//tensorboard/webapp/plugins/npmi/data_source",
        "//tensorboard/webapp/plugins/npmi/util:metric_type",
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

tf_ts_library(
    name = "store_test_lib",
    testonly = True,
    srcs = [
        "npmi_reducers_test.ts",
        "npmi_selectors_test.ts",
    ],
    deps = [
        ":store",
        ":types",
        "//tensorboard/webapp/plugins/npmi/actions",
        "//tensorboard/webapp/plugins/npmi/data_source",
        "//tensorboard/webapp/plugins/npmi/testing",
        "@npm//@types/jasmine",
    ],
)
