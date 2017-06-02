package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_color_scale",
    srcs = [
        "colorScale.ts",
        "palettes.ts",
        "tf-color-scale.html",
    ],
    path = "/tf-color-scale",
    deps = [
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
    ],
)

ts_web_library(
    name = "demo",
    srcs = ["index.html"],
    path = "/tf-color-scale",
    deps = [
        ":tf_color_scale",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_button",
        "@org_polymer_paper_styles",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
