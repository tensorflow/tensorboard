package(default_visibility = ["//third_party/tensorflow:internal"])

load("@io_bazel_rules_closure//closure:defs.bzl", "web_library")
load("//tensorboard:tensorboard.google.bzl", "tensorboard_typescript_genrule")

licenses(["notice"])  # Apache 2.0

web_library(
    name = "tf_audio_dashboard",
    srcs = [
        "tf-audio-dashboard.html",
        "tf-audio-grid.html",
        "tf-audio-loader.html",
    ],
    path = "/tf-audio-dashboard",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:lodash",
        "@org_polymer",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_slider",
        "@org_polymer_paper_spinner",
        "@org_polymer_paper_styles",
    ],
)

web_library(
    name = "demo",
    srcs = ["index.html"] + glob(["data/**"]),
    path = "/tf-audio-dashboard/demo",
    deps = [
        ":tf_audio_dashboard",
        "//tensorboard/components/tf_imports:d3",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
        "@org_polymer_webcomponentsjs",
    ],
)

web_library(
    name = "test",
    testonly = 1,
    srcs = [
        "audioDashboardTests.js",
        "tests.html",
    ] + glob(["data/**"]),
    path = "/tf-audio-dashboard/test",
    deps = [
        ":tf_audio_dashboard",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:d3",
        "@org_npmjs_registry_web_component_tester",
        "@org_polymer",
        "@org_polymer_webcomponentsjs",
    ],
)

tensorboard_typescript_genrule(
    name = "ts",
    testonly = 1,
    srcs = ["audioDashboardTests.ts"],
    typings = [
        "@org_definitelytyped//:chai.d.ts",
        "@org_definitelytyped//:mocha.d.ts",
        "@org_definitelytyped//:sinon.d.ts",
        "@org_definitelytyped//:polymer.d.ts",
        "@org_definitelytyped//:webcomponents.js.d.ts",
        "//tensorboard/components/tf_backend:bundle.d.ts",
        "//tensorboard/components/tf_imports:d3.d.ts",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
