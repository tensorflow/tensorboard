package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "vz_line_chart",
    srcs = [
        "vz-line-chart.html",
        "vz-line-chart.ts",
    ],
    path = "/vz-line-chart",
    visibility = ["//visibility:public"],
    deps = [
        ":dragZoomInteraction",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:plottable",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/vz_chart_helpers",
    ],
)

tf_web_library(
    name = "dragZoomInteraction",
    srcs = [
        "dragZoomInteraction.html",
        "dragZoomInteraction.ts",
    ],
    path = "/vz-line-chart",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:plottable",
    ],
)

tensorboard_webcomponent_library(
    name = "dragZoomInteraction_legacy",
    srcs = [":dragZoomInteraction"],
    visibility = ["//visibility:public"],
    destdir = "vz-line-chart",
    deps = [
        "//tensorboard/components/tf_imports_google:lib",
    ],
)

tf_web_library(
    name = "demo",
    srcs = ["index.html"],
    path = "/vz-line-chart",
    deps = [
        ":vz_line_chart",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":vz_line_chart"],
    visibility = ["//visibility:public"],
    destdir = "vz-line-chart",
    deps = [
        ":dragZoomInteraction_legacy",
        "//tensorboard/components/tf_imports_google:lib",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)
