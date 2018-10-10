package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "demo",
    srcs = ["index.html"],
    path = "/tf-scalar-dashboard/demo",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "//tensorboard/plugins/scalar/tf_scalar_dashboard",
        "//tensorboard/plugins/scalar/tf_scalar_dashboard/demo/data",
        "//tensorboard/demo:demo_data",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)
