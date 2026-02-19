load("//tensorbored/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorbored:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_runs_selector",
    srcs = ["tf-runs-selector.ts"],
    strict_checks = False,
    deps = [
        "//tensorbored/components/polymer:irons_and_papers",
        "//tensorbored/components/polymer:legacy_element_mixin",
        "//tensorbored/components/tf_backend",
        "//tensorbored/components/tf_color_scale",
        "//tensorbored/components/tf_dashboard_common",
        "//tensorbored/components/tf_storage",
        "//tensorbored/components/tf_wbr_string",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
