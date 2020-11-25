load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "text_v2",
    srcs = [
        "text_v2_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins:plugin_registry",
        "//tensorboard/webapp/plugins/text_v2/data_source",
        "//tensorboard/webapp/plugins/text_v2/effects",
        "//tensorboard/webapp/plugins/text_v2/store",
        "//tensorboard/webapp/plugins/text_v2/views/text_dashboard",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = [
        "testing.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/text_v2/data_source",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
    deps = [
        "//tensorboard/components/tf_categorization_utils",
    ],
)
