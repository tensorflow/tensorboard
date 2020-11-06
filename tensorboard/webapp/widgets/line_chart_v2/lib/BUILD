load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ts_library(
    name = "internal_types",
    srcs = [
        "internal_types.ts",
        "scale_types.ts",
    ],
    visibility = [
        "//tensorboard/webapp/widgets/line_chart_v2/lib:__subpackages__",
    ],
)

tf_ts_library(
    name = "public_types",
    srcs = [
        "public_types.ts",
    ],
    deps = [
        ":internal_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/renderer:types",
    ],
)

tf_ts_library(
    name = "worker_pool",
    srcs = ["worker_pool.ts"],
    deps = [
        ":worker",
    ],
)

tf_ts_library(
    name = "coordinator",
    srcs = [
        "coordinator.ts",
        "threejs_coordinator.ts",
    ],
    deps = [
        ":internal_types",
        ":scale",
        ":utils",
        "@npm//three",
    ],
)

tf_ts_library(
    name = "worker",
    srcs = ["worker.ts"],
    visibility = ["//visibility:private"],
)

tf_ts_library(
    name = "scale",
    srcs = [
        "scale.ts",
    ],
    deps = [
        ":internal_types",
        "//tensorboard/webapp/third_party:d3",
    ],
)

tf_ts_library(
    name = "utils",
    srcs = [
        "utils.ts",
    ],
    deps = [
        ":internal_types",
    ],
)

tf_ts_library(
    name = "drawable",
    srcs = [
        "drawable.ts",
        "paint_brush.ts",
    ],
    deps = [
        ":coordinator",
        ":internal_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/renderer:types",
    ],
)

tf_ts_library(
    name = "series_line_view",
    srcs = [
        "series_line_view.ts",
    ],
    deps = [
        ":drawable",
    ],
)

tf_ts_library(
    name = "lib_tests",
    testonly = True,
    srcs = [
        "coordinator_test.ts",
        "drawable_test.ts",
        "scale_test.ts",
        "worker_pool_test.ts",
    ],
    deps = [
        ":coordinator",
        ":drawable",
        ":internal_types",
        ":scale",
        ":worker",
        ":worker_pool",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/renderer",
        "@npm//@types/jasmine",
    ],
)
