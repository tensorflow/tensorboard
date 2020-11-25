load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "store",
    srcs = [
        "index.ts",
        "text_v2_reducers.ts",
        "text_v2_selectors.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/plugins/text_v2:types",
        "//tensorboard/webapp/plugins/text_v2/data_source",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "types",
    srcs = [
        "text_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/text_v2/data_source",
        "//tensorboard/webapp/types",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "store_test_lib",
    testonly = True,
    srcs = [
        "testing.ts",
        "text_v2_selectors_test.ts",
    ],
    deps = [
        ":store",
        ":types",
        "//tensorboard/webapp/plugins/text_v2:testing",
        "//tensorboard/webapp/plugins/text_v2/data_source",
        "@npm//@types/jasmine",
    ],
)
