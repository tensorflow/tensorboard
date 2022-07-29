load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ts_library")
load("//tensorboard/defs:js.bzl", "tf_resource_digest_suffixer")

package(default_visibility = ["//tensorboard/webapp/widgets/line_chart_v2/lib:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "message_types",
    srcs = [
        "message_types.ts",
    ],
    deps = [
        ":compact_data_series",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:internal_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/renderer:types",
        "@npm//@types/offscreencanvas",
    ],
)

tf_ts_library(
    name = "compact_data_series",
    srcs = [
        "compact_data_series.ts",
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
        ":compact_data_series",
        ":message_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:chart",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:chart_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:internal_types",
    ],
)

tf_ts_library(
    name = "worker_chart",
    srcs = [
        "worker_chart.ts",
        "worker_resource.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":compact_data_series",
        ":message_types",
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
        "compact_data_series_test.ts",
        "worker_chart_test.ts",
        "worker_pool_test.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":compact_data_series",
        ":message_types",
        ":worker_chart",
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
    visibility = ["//tensorboard:internal"],
    deps = [
        ":worker_chart_bridge",
    ],
)

tf_resource_digest_suffixer(
    name = "worker_resource",
    out = "worker_resource.ts",
    resources = {
        "%CHART_WORKER.js%": ":chart_worker.js",
    },
    template = "worker_resource.template.ts",
)
