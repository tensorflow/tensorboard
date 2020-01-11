load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_globals",
    srcs = [
        "globals.ts",
        "globals-polymer.ts",
        "tf-globals.html",
    ],
    path = "/tf-globals",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_globals"],
    destdir = "tf-globals",
    deps = [
        "//tensorboard/components/tf_imports:polymer_lib",
    ],
)
