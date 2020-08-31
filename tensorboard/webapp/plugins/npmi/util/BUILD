load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "metric_type",
    srcs = [
        "metric_type.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/npmi/store:types",
    ],
)

ng_module(
    name = "filter_annotations",
    srcs = [
        "filter_annotations.ts",
    ],
    deps = [
        ":metric_type",
        "//tensorboard/webapp/plugins/npmi/store:types",
    ],
)

ng_module(
    name = "violin_data",
    srcs = [
        "violin_data.ts",
    ],
    deps = [
        ":metric_type",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "@npm//@types/d3",
        "@npm//d3",
    ],
)
