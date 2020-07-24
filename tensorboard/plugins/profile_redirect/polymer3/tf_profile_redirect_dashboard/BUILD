load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_profile_redirect_dashboard",
    srcs = ["tf-profile-redirect-dashboard.html"],
    path = "/tf-profile-redirect-dashboard",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "@org_polymer_paper_button",
    ],
)
