# Description:
# TensorBoard, a dashboard for investigating TensorFlow

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

# Protobuf files copied from the main TensorFlow repository.
# Keep this list synced with proto_test.py
tb_proto_library(
    name = "protos_all",
    srcs = [
        "allocation_description.proto",
        "api_def.proto",
        "attr_value.proto",
        "cluster.proto",
        "config.proto",
        "cost_graph.proto",
        "cpp_shape_inference.proto",
        "debug.proto",
        "event.proto",
        "function.proto",
        "graph.proto",
        "meta_graph.proto",
        "node_def.proto",
        "op_def.proto",
        "rewriter_config.proto",
        "saved_object_graph.proto",
        "saver.proto",
        "step_stats.proto",
        "struct.proto",
        "summary.proto",
        "tensor_description.proto",
        "tfprof_log.proto",
        "trackable_object_graph.proto",
        "variable.proto",
        "verifier_config.proto",
        "versions.proto",
    ],
    visibility = ["//visibility:public"],
    deps = [":tensor_proto_lib"],
)

tb_proto_library(
    name = "tensor_proto_lib",
    srcs = [
        "resource_handle.proto",
        "tensor.proto",
        "tensor_shape.proto",
        "types.proto",
    ],
)

py_test(
    name = "proto_test",
    size = "small",
    srcs = ["proto_test.py"],
    srcs_version = "PY2AND3",
    tags = [
        "manual",
        "notap",
    ],
    deps = [
        ":protos_all_py_pb2",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
    ],
)
