package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

# Generating tf_web_library friendly message.ts.
# The genrule creates a new version of message.ts that prepends
# `namespace tb_plugin.lib.DO_NOT_USE_INTERNAL {` and appends
# `} // namespace tb_plugin.lib.DO_NOT_USE_INTERNAL`.
# TODO(tensorboard-team): tf_ts_library and tf_web_library do not interoperate
# yet we do have a requirement to make the plugin_lib use tf_ts_library. Remove
# this when the two can interop or tf_web_library gets deprecated.
genrule(
    name = "message_lib",
    srcs = [
        "//tensorboard/components/experimental/plugin_lib:message.ts",
    ],
    outs = ["message.ts"],
    cmd = """
        echo "namespace tb_plugin.lib.DO_NOT_USE_INTERNAL {" >$@
        cat $< >>$@
        echo "} // namespace tb_plugin.lib.DO_NOT_USE_INTERNAL" >>$@
    """,
)

tf_web_library(
    name = "message",
    srcs = [
        "message.html",
        ":message_lib",
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
