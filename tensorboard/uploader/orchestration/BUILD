# Description:
# Utilities for batching and otherwise organizing gRPC requests
# for TensorBoard.dev uploader.


package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "byte_budget_manager",
    srcs = ["byte_budget_manager.py"],
    srcs_version = "PY3",
    deps = [],
)


py_test(
    name = "byte_budget_manager_test",
    srcs = ["byte_budget_manager_test.py"],
    deps = [
        ":byte_budget_manager",
        "//tensorboard:test",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
    ],
)


py_library(
    name = "batched_request_sender",
    srcs = ["batched_request_sender.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/uploader:util",
        "//tensorboard/uploader:uploader_errors",
        "//tensorboard/backend:process_graph",
        ":byte_budget_manager",
        ":blob_request_sender",
        ":scalar_batched_request_sender",
        ":tensor_batched_request_sender",
        "//tensorboard/util:grpc_util",
        "//tensorboard/util:tensor_util",
    ],
)

py_test(
    name = "batched_request_sender_test",
    srcs = ["batched_request_sender_test.py"],
    deps = [
        ":batched_request_sender",
        "@com_google_protobuf//:protobuf_python",
        "//tensorboard:data_compat",
        "//tensorboard:dataclass_compat",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:expect_grpc_testing_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins/scalar:summary_v2",
        "//tensorboard/summary:summary_v1",
        "//tensorboard/uploader:logdir_loader",
        "//tensorboard/uploader:test_util",
        "//tensorboard/uploader:upload_tracker",
        "//tensorboard/uploader:util",
        "//tensorboard/uploader/proto:protos_all_py_pb2_grpc",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/util:test_util",
    ],
)

py_library(
    name = "scalar_batched_request_sender",
    srcs = ["scalar_batched_request_sender.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/uploader:util",
        "//tensorboard/uploader:uploader_errors",
        ":byte_budget_manager",
        "//tensorboard/util:grpc_util",
        "//tensorboard/util:tensor_util",
    ],
)

py_test(
    name = "scalar_batched_request_sender_test",
    srcs = ["scalar_batched_request_sender_test.py"],
    deps = [
        ":scalar_batched_request_sender",
        "@com_google_protobuf//:protobuf_python",
        "//tensorboard:data_compat",
        "//tensorboard:dataclass_compat",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:expect_grpc_testing_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins/scalar:summary_v2",
        "//tensorboard/summary:summary_v1",
        "//tensorboard/uploader:logdir_loader",
        "//tensorboard/uploader:test_util",
        "//tensorboard/uploader:upload_tracker",
        "//tensorboard/uploader:util",
        "//tensorboard/uploader/proto:protos_all_py_pb2_grpc",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/util:test_util",
    ],
)

py_library(
    name = "tensor_batched_request_sender",
    srcs = ["tensor_batched_request_sender.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/uploader:util",
        "//tensorboard/uploader:uploader_errors",
        ":byte_budget_manager",
        "//tensorboard/util:grpc_util",
        "//tensorboard/util:tensor_util",
    ],
)

py_test(
    name = "tensor_batched_request_sender_test",
    srcs = ["tensor_batched_request_sender_test.py"],
    deps = [
        ":tensor_batched_request_sender",
        "@com_google_protobuf//:protobuf_python",
        "//tensorboard:data_compat",
        "//tensorboard:dataclass_compat",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:expect_grpc_testing_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins/scalar:summary_v2",
        "//tensorboard/summary:summary_v1",
        "//tensorboard/uploader:logdir_loader",
        "//tensorboard/uploader:test_util",
        "//tensorboard/uploader:upload_tracker",
        "//tensorboard/uploader:util",
        "//tensorboard/uploader/proto:protos_all_py_pb2_grpc",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/util:test_util",
    ],
)

py_library(
    name = "blob_request_sender",
    srcs = ["blob_request_sender.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/uploader:util",
        "//tensorboard/uploader:uploader_errors",
        ":byte_budget_manager",
        "//tensorboard/util:grpc_util",
        "//tensorboard/util:tensor_util",
    ],
)

py_test(
    name = "blob_request_sender_test",
    srcs = ["blob_request_sender_test.py"],
    deps = [
        ":blob_request_sender",
        "@com_google_protobuf//:protobuf_python",
        "//tensorboard:data_compat",
        "//tensorboard:dataclass_compat",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:expect_grpc_testing_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins/scalar:summary_v2",
        "//tensorboard/summary:summary_v1",
        "//tensorboard/uploader:logdir_loader",
        "//tensorboard/uploader:test_util",
        "//tensorboard/uploader:upload_tracker",
        "//tensorboard/uploader:util",
        "//tensorboard/uploader/proto:protos_all_py_pb2_grpc",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/util:test_util",
    ],
)