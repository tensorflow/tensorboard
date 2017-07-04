package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_backend",
    srcs = [
        "backend.ts",
        "canceller.ts",
        "requestManager.ts",
        "router.ts",
        "runsStore.ts",
        "tf-backend.html",
        "urlPathHelpers.ts",
    ],
    path = "/tf-backend",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:plottable",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/vz_sorting",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_backend"],
    destdir = "tf-backend",
    deps = [
        "//tensorboard/components/tf_imports_google:lib",
        "//tensorboard/components/vz_sorting:legacy",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)

