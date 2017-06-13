package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "demo",
    srcs = ["index.html"] + glob(["data/**"]),
    path = "/tf-profile-dashboard/demo",
    deps = [
        "//tensorboard/components/tf_profile_dashboard",
        "//tensorboard/components/tf_trace_viewer:demo",
        "@org_polymer",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_webcomponentsjs",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
