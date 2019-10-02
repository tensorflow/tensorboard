package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "message",
    srcs = [
        "message.html",
        "message.ts",
        "message_namespaced.ts",
    ],
    path = "/tf-plugin-util",
)

tf_web_library(
    name = "host_internals",
    srcs = [
        "plugin-host-ipc.html",
        "plugin-host-ipc.ts",
    ],
    path = "/tf-plugin-util",
    deps = [
        ":message",
    ],
)

tf_web_library(
    name = "plugin_host",
    srcs = [
        "plugin-host.html",
        "runs-host-impl.ts",
    ],
    path = "/tf-plugin-util",
    deps = [
        ":host_internals",
        "//tensorboard/components/tf_backend",
    ],
)

genrule(
    name = "message_namespaced",
    srcs = ["message.ts"],
    outs = ["message_namespaced.ts"],
    cmd = "\n".join([
        "(",
        '  echo "namespace tb_plugin.lib.DO_NOT_USE_INTERNAL {\n$$(<$<)\n}"',
        ") >$@",
    ]),
)
