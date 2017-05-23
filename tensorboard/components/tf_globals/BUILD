package(default_visibility = ["//third_party/tensorflow:internal"])

load("@io_bazel_rules_closure//closure:defs.bzl", "web_library")
load("//tensorboard:hacks.bzl", "tensorboard_typescript_bundle")
load("//tensorboard:tensorboard.google.bzl", "tensorboard_typescript_genrule")

licenses(["notice"])  # Apache 2.0

web_library(
    name = "tf_globals",
    srcs = [
        "bundle.js",
        "tf-globals.html",
    ],
    path = "/tf-globals",
)

tensorboard_typescript_genrule(
    name = "ts",
    srcs = ["bundle.ts"],
)

tensorboard_typescript_bundle(
    name = "bundle",
    out = "bundle.ts",
    namespace_srcs = {"TF.Globals": ["globals.ts"]},
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
        "tf-globals.html",
        ":legacy_ts",
    ],
    destdir = "tf-globals",
)

tensorboard_ts_library(
    name = "legacy_ts",
    srcs = ["globals.ts"],
    deps_mgmt = "off",
    runtime = "nodejs",
)
