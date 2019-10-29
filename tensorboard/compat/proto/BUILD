# Description:
# TensorBoard, a dashboard for investigating TensorFlow

package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

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
        "resource_handle.proto",
        "rewriter_config.proto",
        "saved_object_graph.proto",
        "saver.proto",
        "step_stats.proto",
        "struct.proto",
        "summary.proto",
        "tensor.proto",
        "tensor_description.proto",
        "tensor_shape.proto",
        "tfprof_log.proto",
        "trackable_object_graph.proto",
        "types.proto",
        "variable.proto",
        "verifier_config.proto",
        "versions.proto",
    ],
    visibility = ["//visibility:public"],
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
