load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "polymer3_ts_lib",
    srcs = ["polymer3_lib.ts"],
    deps = [
        "//tensorboard/components_polymer3/experimental/plugin_util:plugin_host",
        "//tensorboard/components_polymer3/tf_backend",
        "//tensorboard/components_polymer3/tf_globals",
        "//tensorboard/components_polymer3/tf_markdown_view",
        "//tensorboard/components_polymer3/tf_paginated_view",
        "//tensorboard/components_polymer3/tf_storage",
        "//tensorboard/plugins/audio/polymer3/tf_audio_dashboard",
        "//tensorboard/plugins/custom_scalar/polymer3/tf_custom_scalar_dashboard",
        "//tensorboard/plugins/distribution/polymer3/tf_distribution_dashboard",
        "//tensorboard/plugins/graph/polymer3/tf_graph_dashboard",
        "//tensorboard/plugins/histogram/polymer3/tf_histogram_dashboard",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_dashboard",
        "//tensorboard/plugins/image/polymer3/tf_image_dashboard",
        "//tensorboard/plugins/mesh/polymer3/tf_mesh_dashboard",
        "//tensorboard/plugins/pr_curve/polymer3/tf_pr_curve_dashboard",
        "//tensorboard/plugins/profile_redirect/polymer3/tf_profile_redirect_dashboard",
        "//tensorboard/plugins/scalar/polymer3/tf_scalar_dashboard",
        "//tensorboard/plugins/text/polymer3/tf_text_dashboard",
    ],
)

tf_js_binary(
    name = "polymer3_lib_binary_no_shim",
    compile = True,
    entry_point = ":polymer3_lib.ts",
    deps = [":polymer3_ts_lib"],
)

genrule(
    name = "polymer3_lib_binary",
    srcs = [
        # Do not sort. order is important.
        "@npm//:node_modules/web-animations-js/web-animations-next-lite.min.js",
        ":polymer3_lib_binary_no_shim.js",
    ],
    outs = ["polymer3_lib_binary.js"],
    cmd = "for f in $(SRCS); do cat \"$$f\"; echo; done > $@",
)

genrule(
    name = "gen_tensorboard.html",
    srcs = ["tensorboard.uninlined.html"],
    outs = ["tensorboard.html"],
    cmd = "$(execpath //tensorboard/logo:inline_favicon) $< >$@",
    tools = ["//tensorboard/logo:inline_favicon"],
)

tf_web_library(
    name = "analytics_html",
    srcs = [
        "analytics.html",
    ],
    path = "/",
)

tf_ts_library(
    name = "analytics",
    srcs = [
        "analytics.ts",
    ],
)

tf_ts_library(
    name = "security",
    srcs = [
        "security.ts",
    ],
    strict_checks = False,
    deps = [
        "@npm//@polymer/polymer",
    ],
)
