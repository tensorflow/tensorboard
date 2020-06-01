load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_runs_selector",
    srcs = [
        "tf-runs-selector.html",
        "tf-wbr-string.html",
    ],
    path = "/tf-runs-selector",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:polymer",
        "@org_polymer_paper_button",
        "@org_polymer_paper_dialog",
        "@org_polymer_paper_styles",
    ],
)
