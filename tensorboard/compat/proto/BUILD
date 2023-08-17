# Description:
# TensorBoard, a dashboard for investigating TensorFlow

load("@rules_python//python:py_test.bzl", "py_test")
load("//tensorboard/defs:protos.bzl", "tb_proto_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

filegroup(
    name = "proto_srcs",
    srcs = glob(["*.proto"]),
)

py_test(
    name = "proto_test",
    size = "small",
    srcs = ["proto_test.py"],
    srcs_version = "PY3",
    tags = [
        "manual",
        "notap",
    ],
    deps = [
        ":protos_all_py_pb2",
        "//tensorboard:expect_protobuf_installed",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

# DO NOT EDIT: This line and rest of file are AUTOMATICALLY GENERATED
# by tensorboard/compat/proto/update.sh.

tb_proto_library(
    name = "allocation_description",
    srcs = ["allocation_description.proto"],
)

tb_proto_library(
    name = "api_def",
    srcs = ["api_def.proto"],
    deps = [
        ":attr_value",
    ],
)

tb_proto_library(
    name = "attr_value",
    srcs = ["attr_value.proto"],
    deps = [
        ":tensor",
        ":tensor_shape",
        ":types",
    ],
)

tb_proto_library(
    name = "cluster",
    srcs = ["cluster.proto"],
)

tb_proto_library(
    name = "config",
    srcs = ["config.proto"],
    deps = [
        ":cluster",
        ":coordination_config",
        ":cost_graph",
        ":debug",
        ":graph",
        ":rewriter_config",
        ":rpc_options",
        ":step_stats",
    ],
)

tb_proto_library(
    name = "coordination_config",
    srcs = ["coordination_config.proto"],
)

tb_proto_library(
    name = "cost_graph",
    srcs = ["cost_graph.proto"],
    deps = [
        ":tensor_shape",
        ":types",
    ],
)

tb_proto_library(
    name = "cpp_shape_inference",
    srcs = ["cpp_shape_inference.proto"],
    deps = [
        ":full_type",
        ":tensor_shape",
        ":types",
    ],
)

tb_proto_library(
    name = "debug",
    srcs = ["debug.proto"],
)

tb_proto_library(
    name = "event",
    srcs = ["event.proto"],
    deps = [
        ":summary",
    ],
)

tb_proto_library(
    name = "full_type",
    srcs = ["full_type.proto"],
)

tb_proto_library(
    name = "function",
    srcs = ["function.proto"],
    deps = [
        ":attr_value",
        ":node_def",
        ":op_def",
    ],
)

tb_proto_library(
    name = "graph_debug_info",
    srcs = ["graph_debug_info.proto"],
)

tb_proto_library(
    name = "graph",
    srcs = ["graph.proto"],
    deps = [
        ":function",
        ":graph_debug_info",
        ":node_def",
        ":versions",
    ],
)

tb_proto_library(
    name = "histogram",
    srcs = ["histogram.proto"],
)

tb_proto_library(
    name = "meta_graph",
    srcs = ["meta_graph.proto"],
    deps = [
        ":graph",
        ":op_def",
        ":saved_object_graph",
        ":saver",
        ":struct",
        ":tensor",
        ":tensor_shape",
        ":types",
    ],
)

tb_proto_library(
    name = "node_def",
    srcs = ["node_def.proto"],
    deps = [
        ":attr_value",
        ":full_type",
    ],
)

tb_proto_library(
    name = "op_def",
    srcs = ["op_def.proto"],
    deps = [
        ":attr_value",
        ":full_type",
        ":resource_handle",
        ":types",
    ],
)

tb_proto_library(
    name = "resource_handle",
    srcs = ["resource_handle.proto"],
    deps = [
        ":tensor_shape",
        ":types",
    ],
)

tb_proto_library(
    name = "rewriter_config",
    srcs = ["rewriter_config.proto"],
    deps = [
        ":attr_value",
        ":verifier_config",
    ],
)

tb_proto_library(
    name = "rpc_options",
    srcs = ["rpc_options.proto"],
)

tb_proto_library(
    name = "saved_object_graph",
    srcs = ["saved_object_graph.proto"],
    deps = [
        ":struct",
        ":tensor_shape",
        ":trackable_object_graph",
        ":types",
        ":variable",
        ":versions",
    ],
)

tb_proto_library(
    name = "saver",
    srcs = ["saver.proto"],
)

tb_proto_library(
    name = "step_stats",
    srcs = ["step_stats.proto"],
    deps = [
        ":allocation_description",
        ":tensor_description",
    ],
)

tb_proto_library(
    name = "struct",
    srcs = ["struct.proto"],
    deps = [
        ":tensor",
        ":tensor_shape",
        ":types",
    ],
)

tb_proto_library(
    name = "summary",
    srcs = ["summary.proto"],
    exports = [
        ":histogram",
    ],
    deps = [
        ":histogram",
        ":tensor",
    ],
)

tb_proto_library(
    name = "tensor_description",
    srcs = ["tensor_description.proto"],
    deps = [
        ":allocation_description",
        ":tensor_shape",
        ":types",
    ],
)

tb_proto_library(
    name = "tensor",
    srcs = ["tensor.proto"],
    deps = [
        ":resource_handle",
        ":tensor_shape",
        ":types",
    ],
)

tb_proto_library(
    name = "tensor_shape",
    srcs = ["tensor_shape.proto"],
)

tb_proto_library(
    name = "tfprof_log",
    srcs = ["tfprof_log.proto"],
    deps = [
        ":attr_value",
        ":step_stats",
    ],
)

tb_proto_library(
    name = "trackable_object_graph",
    srcs = ["trackable_object_graph.proto"],
)

tb_proto_library(
    name = "types",
    srcs = ["types.proto"],
)

tb_proto_library(
    name = "variable",
    srcs = ["variable.proto"],
)

tb_proto_library(
    name = "verifier_config",
    srcs = ["verifier_config.proto"],
)

tb_proto_library(
    name = "versions",
    srcs = ["versions.proto"],
)

# Protobuf files copied from the main TensorFlow repository.
# Keep this list synced with proto_test.py
tb_proto_library(
    name = "protos_all",
    srcs = [],
    visibility = ["//visibility:public"],
    deps = [
        ":allocation_description",
        ":api_def",
        ":attr_value",
        ":cluster",
        ":config",
        ":coordination_config",
        ":cost_graph",
        ":cpp_shape_inference",
        ":debug",
        ":event",
        ":full_type",
        ":function",
        ":graph",
        ":graph_debug_info",
        ":histogram",
        ":meta_graph",
        ":node_def",
        ":op_def",
        ":resource_handle",
        ":rewriter_config",
        ":rpc_options",
        ":saved_object_graph",
        ":saver",
        ":step_stats",
        ":struct",
        ":summary",
        ":tensor",
        ":tensor_description",
        ":tensor_shape",
        ":tfprof_log",
        ":trackable_object_graph",
        ":types",
        ":variable",
        ":verifier_config",
        ":versions",
    ],
)
