load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard/webapp/widgets/line_chart_v2/lib:__subpackages__"])

tf_ts_library(
    name = "worker_chart_types",
    srcs = [
        "worker_chart_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/widgets/line_chart_v2/lib:internal_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/renderer:types",
    ],
)

tf_ts_library(
    name = "worker_chart_utils",
    srcs = [
        "worker_chart_utils.ts",
    ],
    deps = [
        "//tensorboard/webapp/widgets/line_chart_v2/lib:internal_types",
    ],
)

tf_ts_library(
    name = "worker_chart_bridge",
    srcs = [
        "worker_chart_bridge.ts",
    ],
    deps = [
        ":worker_chart_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:chart",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:chart_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:internal_types",
    ],
)

tf_ts_library(
    name = "worker_chart",
    srcs = [
        "worker_chart.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":worker_chart_types",
        ":worker_chart_utils",
        ":worker_pool",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:chart_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:internal_types",
    ],
)

tf_ts_library(
    name = "worker_pool",
    srcs = ["worker_pool.ts"],
    deps = [
        "//tensorboard/webapp/widgets/line_chart_v2/lib:worker",
    ],
)

tf_ts_library(
    name = "worker_test",
    testonly = True,
    srcs = [
        "worker_chart_test.ts",
        "worker_chart_utils_test.ts",
        "worker_pool_test.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":worker_chart",
        ":worker_chart_types",
        ":worker_chart_utils",
        ":worker_pool",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:internal_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/renderer:types",
        "@npm//@types/jasmine",
    ],
)

tf_js_binary(
    name = "chart_worker",
    compile = True,
    entry_point = "worker_chart_bridge.ts",
    deps = [
        ":worker_chart_bridge",
    ],
)
