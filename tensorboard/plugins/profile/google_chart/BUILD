package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "google_chart",
    srcs = [
        "google-chart.html",
        "google-chart-loader.html",
        "google-chart-styles.html",
    ],
    path = "/google-chart",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "@org_polymer_iron_ajax",
    ],
)

tf_web_library(
    name = "google_chart_demo",
    srcs = [
        "google-chart-demo.html",
    ],
    path = "/google-chart",
    visibility = ["//visibility:public"],
    deps = [
        ":google_chart",
    ],
)
