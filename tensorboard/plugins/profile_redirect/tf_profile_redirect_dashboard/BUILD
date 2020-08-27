load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_profile_redirect_dashboard",
    srcs = ["tf-profile-redirect-dashboard.ts"],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
