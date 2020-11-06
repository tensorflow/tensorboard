load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ts_library(
    name = "renderer",
    srcs = [
        "index.ts",
        "svg_renderer.ts",
        "threejs_renderer.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/third_party:d3",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:coordinator",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:internal_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:utils",
        "@npm//three",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "renderer_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/widgets/line_chart_v2/lib:internal_types",
    ],
)

tf_ts_library(
    name = "renderer_test",
    testonly = True,
    srcs = [
        "renderer_test.ts",
    ],
    deps = [
        ":renderer",
        ":types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:coordinator",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:internal_types",
        "@npm//@types/jasmine",
        "@npm//three",
    ],
)
