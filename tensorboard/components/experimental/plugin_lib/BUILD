package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

# Generating module friendly message.ts.
# TODO(tensorboard-team): tf_ts_library and tf_web_library do not interoperate
# yet we do have a requirement to make the plugin_lib use tf_ts_library. Remove
# this when the two can interop or tf_web_library gets deprecated.
genrule(
    name = "message_lib",
    srcs = [
        "//tensorboard/components/experimental/plugin_util:message.ts",
    ],
    outs = ["message.ts"],
    cmd = """
        cat $< | sed -e "s|^namespace .*||" | sed -e "s|^} // namespace .*||" >$@
    """,
)

tf_ts_library(
    name = "plugin_lib",
    srcs = [
        "index.ts",
        "plugin-guest.ts",
        "runs.ts",
        ":message_lib",
    ],
)
