package(default_visibility = ["//third_party/tensorflow:internal"])

load("@io_bazel_rules_closure//closure:defs.bzl", "web_library")
load("//tensorboard:hacks.bzl", "tensorboard_typescript_bundle")
load("//tensorboard:tensorboard.google.bzl", "tensorboard_typescript_genrule")

licenses(["notice"])  # Apache 2.0

web_library(
    name = "tf_storage",
    srcs = [
        "bundle.js",
        "tf-storage.html",
    ],
    path = "/tf-storage",
    deps = [
        "//tensorboard/components/tf_globals",
        "//tensorboard/components/tf_imports:lodash",
    ],
)

tensorboard_typescript_genrule(
    name = "ts",
    srcs = ["bundle.ts"],
    typings = [
        "@org_definitelytyped//:lodash.d.ts",
        "@org_definitelytyped//:polymer.d.ts",
        "@org_definitelytyped//:webcomponents.js.d.ts",
        "//tensorboard/components/tf_globals:bundle.d.ts",
        "//tensorboard/components/tf_imports:d3.d.ts",
    ],
)

tensorboard_typescript_bundle(
    name = "bundle",
    out = "bundle.ts",
    namespace_srcs = {"TF.URIStorage": [
        "storage.ts",
    ]},
    namespace_symbol_aliases = {"TF.URIStorage": {
        "TABS": "TF.Globals.TABS",
        "USE_HASH": "TF.Globals.USE_HASH",
        "getFakeHash": "TF.Globals.getFakeHash",
        "setFakeHash": "TF.Globals.setFakeHash",
    }},
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)

################################################################################
# MARKED FOR DELETION
load("//tensorboard:tensorboard.google.bzl", "tensorboard_ts_library")
load("//tensorboard:tensorboard.google.bzl", "tensorboard_webcomponent_library")

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [
        "tf-storage.html",
        ":legacy_ts",
    ],
    destdir = "tf-storage",
    deps = [
        "//tensorboard/components/tf_globals:legacy",
        "//tensorboard/components/tf_imports_google:lib",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)

tensorboard_ts_library(
    name = "legacy_ts",
    srcs = ["storage.ts"],
    deps_mgmt = "off",
    runtime = "nodejs",
    deps = [
        "//tensorboard/components/tf_globals:legacy_ts",
        "//third_party/javascript/typings/lodash",
    ],
)
