load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "polymer3_ts_lib",
    srcs = ["polymer3_lib.ts"],
    deps = [
        ":polymer3_interop_helper",
        "//tensorboard/plugins/audio/tf_audio_dashboard",
        "//tensorboard/plugins/custom_scalar/tf_custom_scalar_dashboard",
        "//tensorboard/plugins/distribution/tf_distribution_dashboard",
        "//tensorboard/plugins/graph/tf_graph_dashboard",
        "//tensorboard/plugins/histogram/tf_histogram_dashboard",
        "//tensorboard/plugins/hparams/tf_hparams_dashboard",
        "//tensorboard/plugins/image/tf_image_dashboard",
        "//tensorboard/plugins/mesh/tf_mesh_dashboard",
        "//tensorboard/plugins/pr_curve/tf_pr_curve_dashboard",
        "//tensorboard/plugins/profile_redirect/tf_profile_redirect_dashboard",
        "//tensorboard/plugins/scalar/tf_scalar_dashboard",
        "//tensorboard/plugins/text/tf_text_dashboard",
        "//tensorboard/plugins/wit_redirect/tf_wit_redirect_dashboard",
    ],
)

tf_ts_library(
    name = "polymer3_interop_helper",
    srcs = ["polymer3_interop_helper.ts"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_feature_flags",
        "//tensorboard/components/tf_globals",
        "//tensorboard/components/tf_markdown_view",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_storage",
    ],
)

tf_js_binary(
    name = "polymer3_lib_binary_no_shim",
    compile = True,
    entry_point = ":polymer3_lib.ts",
    includes_polymer = True,
    deps = [":polymer3_ts_lib"],
)

# Keep in sync with //tensorboard/webapp/dev_assets:polymer3_lib_binary_dev
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
