# Description:
# Uploader for TensorBoard.dev

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "dev_creds",
    srcs = ["dev_creds.py"],
)

py_library(
    name = "exporter_lib",
    srcs = ["exporter.py"],
    deps = [
        ":util",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/util:grpc_util",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "exporter_test",
    srcs = ["exporter_test.py"],
    deps = [
        ":exporter_lib",
        ":test_util",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:expect_grpc_testing_installed",
        "//tensorboard:test",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/uploader/proto:protos_all_py_pb2_grpc",
        "//tensorboard/util:grpc_util",
        "@org_pythonhosted_mock",
    ],
)

py_binary(
    name = "uploader",
    srcs = ["uploader_main.py"],
    main = "uploader_main.py",
    python_version = "PY2",
    deps = [":uploader_main_lib"],
)

py_library(
    name = "uploader_main_lib",
    srcs = ["uploader_main.py"],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":auth",
        ":dev_creds",
        ":exporter_lib",
        ":server_info",
        ":uploader_lib",
        ":util",
        "//tensorboard:expect_absl_app_installed",
        "//tensorboard:expect_absl_flags_argparse_flags_installed",
        "//tensorboard:expect_absl_flags_installed",
        "//tensorboard:expect_absl_logging_installed",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:program",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/uploader/proto:protos_all_py_pb2_grpc",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "uploader_lib",
    srcs = ["uploader.py"],
    deps = [
        ":logdir_loader",
        ":peekable_iterator",
        ":util",
        "//tensorboard:data_compat",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard/backend/event_processing:directory_loader",
        "//tensorboard/backend/event_processing:event_file_loader",
        "//tensorboard/backend/event_processing:io_wrapper",
        "//tensorboard/plugins/scalar:metadata",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/util:grpc_util",
        "//tensorboard/util:tb_logging",
        "//tensorboard/util:tensor_util",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "uploader_test",
    srcs = ["uploader_test.py"],
    deps = [
        ":test_util",
        ":uploader_lib",
        ":util",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:expect_grpc_testing_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins/histogram:summary_v2",
        "//tensorboard/plugins/scalar:summary_v2",
        "//tensorboard/summary:summary_v1",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/uploader/proto:protos_all_py_pb2_grpc",
        "//tensorboard/util:test_util",
        "@org_pythonhosted_mock",
    ],
)

py_library(
    name = "auth",
    srcs = ["auth.py"],
    deps = [
        ":util",
        "//tensorboard:expect_google_auth_installed",
        "//tensorboard:expect_google_auth_oauthlib_installed",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard/util:tb_logging",
    ],
)

py_test(
    name = "auth_test",
    srcs = ["auth_test.py"],
    deps = [
        ":auth",
        "//tensorboard:expect_google_auth_installed",
        "//tensorboard:test",
        "@org_pythonhosted_mock",
    ],
)

py_library(
    name = "logdir_loader",
    srcs = ["logdir_loader.py"],
    deps = [
        "//tensorboard/backend/event_processing:directory_watcher",
        "//tensorboard/backend/event_processing:io_wrapper",
        "//tensorboard/util:tb_logging",
    ],
)

py_test(
    name = "logdir_loader_test",
    srcs = ["logdir_loader_test.py"],
    deps = [
        ":logdir_loader",
        "//tensorboard:test",
        "//tensorboard/backend/event_processing:directory_loader",
        "//tensorboard/backend/event_processing:event_file_loader",
        "//tensorboard/backend/event_processing:io_wrapper",
        "//tensorboard/util:test_util",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "test_util",
    testonly = 1,
    srcs = ["test_util.py"],
    deps = [
        "//tensorboard:expect_grpc_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "@com_google_protobuf//:protobuf_python",
    ],
)

py_library(
    name = "util",
    srcs = ["util.py"],
)

py_test(
    name = "util_test",
    srcs = ["util_test.py"],
    deps = [
        ":test_util",
        ":util",
        "//tensorboard:test",
        "@com_google_protobuf//:protobuf_python",
        "@org_pythonhosted_mock",
    ],
)

py_library(
    name = "peekable_iterator",
    srcs = ["peekable_iterator.py"],
    srcs_version = "PY2AND3",
)

py_test(
    name = "peekable_iterator_test",
    size = "small",
    srcs = ["peekable_iterator_test.py"],
    deps = [
        ":peekable_iterator",
        "//tensorboard:test",
    ],
)

py_library(
    name = "server_info",
    srcs = ["server_info.py"],
    deps = [
        "//tensorboard:expect_requests_installed",
        "//tensorboard:version",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "@com_google_protobuf//:protobuf_python",
    ],
)

py_test(
    name = "server_info_test",
    size = "medium",  # local network requests
    timeout = "short",
    srcs = ["server_info_test.py"],
    deps = [
        ":server_info",
        "//tensorboard:expect_futures_installed",
        "//tensorboard:test",
        "//tensorboard:version",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "@org_pocoo_werkzeug",
    ],
)
