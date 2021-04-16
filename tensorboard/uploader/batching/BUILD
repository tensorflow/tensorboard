# Description:
# gRPC request batching utilites for TensorBoard.dev uploader.


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
