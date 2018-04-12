package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

# bazel run //tensorboard/plugins/hparams/tf_hparams_dashboard/demo
# google-chrome http://localhost:6006/tf-hparams-dashboard/demo/index.html
tf_web_library(
    name = "demo",
    srcs = ["index.html"] + glob(["data/**"]),
    path = "/tf-hparams-dashboard/demo",
    deps = [
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "//tensorboard/plugins/hparams/tf_hparams_dashboard",
        "@com_google_fonts_roboto",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)
