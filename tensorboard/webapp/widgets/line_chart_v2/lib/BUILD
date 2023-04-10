load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = [
    "//tensorboard/webapp/widgets/line_chart_v2/lib:__subpackages__",
])

tf_ts_library(
    name = "internal_types",
    srcs = [
        "internal_types.ts",
        "scale_types.ts",
    ],
    deps = [
        ":formatter",
    ],
)

tf_ts_library(
    name = "public_types",
    srcs = [
        "public_types.ts",
    ],
    visibility = ["//tensorboard/webapp:__subpackages__"],
    deps = [
        ":chart_types",
        ":formatter",
        ":internal_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/renderer:types",
    ],
)

tf_ts_library(
    name = "chart",
    srcs = [
        "chart.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":chart_types",
        ":coordinator",
        ":internal_types",
        ":scale",
        ":series_line_view",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/renderer",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/renderer:types",
    ],
)

tf_ts_library(
    name = "chart_types",
    srcs = [
        "chart_types.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":internal_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/renderer:types",
        "@npm//@types/offscreencanvas",
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
        "@npm//@types/three",
        "@npm//three",
    ],
)

tf_ts_library(
    name = "worker",
    srcs = ["worker.ts"],
    visibility = ["//tensorboard/webapp/widgets/line_chart_v2/lib/worker:__pkg__"],
)

tf_ts_library(
    name = "scale",
    srcs = [
        "scale.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":formatter",
        ":internal_types",
        "//tensorboard/webapp/third_party:d3",
    ],
)

tf_ts_library(
    name = "formatter",
    srcs = [
        "formatter.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        "//tensorboard/webapp/third_party:d3",
    ],
)

tf_ts_library(
    name = "utils",
    srcs = [
        "utils.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":internal_types",
        "@npm//@types/offscreencanvas",
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
        ":internal_types",
    ],
)

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = [
        "testing.ts",
    ],
    visibility = [
        "//tensorboard/webapp/widgets/line_chart_v2:__subpackages__",
    ],
    deps = [
        ":internal_types",
        "@npm//@types/jasmine",
    ],
)

tf_ts_library(
    name = "lib_tests",
    testonly = True,
    srcs = [
        "coordinator_test.ts",
        "drawable_test.ts",
        "formatter_test.ts",
        "integration_test.ts",
        "scale_test.ts",
    ],
    visibility = [
        "//tensorboard:internal",
    ],
    deps = [
        ":chart",
        ":coordinator",
        ":drawable",
        ":formatter",
        ":internal_types",
        ":public_types",
        ":scale",
        ":testing",
        ":worker",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/renderer",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
    ],
)
