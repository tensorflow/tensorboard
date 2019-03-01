package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_collapsible",
    srcs = [
        "tf-collapsible.html",
    ],
    path = "/tf-collapsible",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "@org_polymer_iron_collapse",
        "@org_polymer_iron_icon",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_collapsible"],
    visibility = ["//visibility:public"],
    destdir = "tf-collapsible",
    deps = [
        "//third_party/javascript/polymer/v1/iron-collapse:lib",
        "//third_party/javascript/polymer/v1/iron-icon:lib",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)
