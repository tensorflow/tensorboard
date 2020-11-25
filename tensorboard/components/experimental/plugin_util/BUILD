load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "message",
    srcs = [
        "message.ts",
    ],
)

tf_ts_library(
    name = "host_internals",
    srcs = [
        "plugin-host-ipc.ts",
    ],
    deps = [
        ":message",
    ],
)

tf_ts_library(
    name = "plugin_host",
    srcs = [
        "core-host-impl.ts",
        "plugin-host.ts",
        "runs-host-impl.ts",
    ],
    deps = [
        ":host_internals",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_storage",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
