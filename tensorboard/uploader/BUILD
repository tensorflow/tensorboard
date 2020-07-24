# Description:
# Uploader for TensorBoard.dev

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "exporter",
    srcs = ["exporter.py"],
    srcs_version = "PY3",
    deps = [
        ":util",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/util:grpc_util",
        "//tensorboard/util:tb_logging",
        "//tensorboard/util:tensor_util",
    ],
)

py_test(
    name = "exporter_test",
    srcs = ["exporter_test.py"],
    deps = [
        ":exporter",
        ":test_util",
        ":util",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:expect_grpc_testing_installed",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:test",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/uploader/proto:protos_all_py_pb2_grpc",
        "//tensorboard/util:grpc_util",
        "//tensorboard/util:tensor_util",
        "@org_pythonhosted_mock",
    ],
)

py_library(
    name = "formatters",
    srcs = ["formatters.py"],
    srcs_version = "PY3",
    deps = [
        ":util",
    ],
)

py_test(
    name = "formatters_test",
    srcs = ["formatters_test.py"],
    deps = [
        ":formatters",
        ":util",
        "//tensorboard:test",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
    ],
)

py_library(
    name = "uploader_subcommand",
    srcs = ["uploader_subcommand.py"],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":auth",
        ":dry_run_stubs",
        ":exporter",
        ":flags_parser",
        ":formatters",
        ":server_info",
        ":uploader",
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
    name = "uploader",
    srcs = ["uploader.py"],
    deps = [
        ":logdir_loader",
        ":upload_tracker",
        ":util",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard/backend:process_graph",
        "//tensorboard/backend/event_processing:directory_loader",
        "//tensorboard/backend/event_processing:event_file_loader",
        "//tensorboard/backend/event_processing:io_wrapper",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins/graph:metadata",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/util:grpc_util",
        "//tensorboard/util:tb_logging",
        "//tensorboard/util:tensor_util",
        "@com_google_protobuf//:protobuf_python",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "upload_tracker",
    srcs = ["upload_tracker.py"],
    deps = [],
)

py_test(
    name = "uploader_test",
    srcs = ["uploader_test.py"],
    srcs_version = "PY3",
    deps = [
        ":dry_run_stubs",
        ":server_info",
        ":test_util",
        ":upload_tracker",
        ":uploader",
        ":uploader_subcommand",
        ":util",
        "//tensorboard:data_compat",
        "//tensorboard:dataclass_compat",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:expect_grpc_testing_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat:no_tensorflow",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins/graph:metadata",
        "//tensorboard/plugins/histogram:summary_v2",
        "//tensorboard/plugins/scalar:metadata",
        "//tensorboard/plugins/scalar:summary_v2",
        "//tensorboard/summary:summary_v1",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/uploader/proto:protos_all_py_pb2_grpc",
        "//tensorboard/util:test_util",
        "@com_google_protobuf//:protobuf_python",
        "@org_pythonhosted_mock",
    ],
)

py_test(
    name = "upload_tracker_test",
    srcs = ["upload_tracker_test.py"],
    srcs_version = "PY3",
    deps = [
        ":upload_tracker",
        "//tensorboard:test",
        "@org_pythonhosted_mock",
    ],
)

py_library(
    name = "dry_run_stubs",
    srcs = ["dry_run_stubs.py"],
    deps = [
        "//tensorboard/uploader/proto:protos_all_py_pb2",
    ],
)

py_test(
    name = "dry_run_stubs_test",
    srcs = ["dry_run_stubs_test.py"],
    srcs_version = "PY3",
    deps = [
        ":dry_run_stubs",
        "//tensorboard:test",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
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
    name = "server_info",
    srcs = ["server_info.py"],
    deps = [
        "//tensorboard:expect_requests_installed",
        "//tensorboard:version",
        "//tensorboard/plugins/scalar:metadata",
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
        "//tensorboard/plugins/scalar:metadata",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "flags_parser",
    srcs = ["flags_parser.py"],
    visibility = ["//tensorboard:internal"],
    deps = [
        "//tensorboard:expect_absl_flags_argparse_flags_installed",
    ],
)

py_test(
    name = "flags_parser_test",
    srcs = ["flags_parser_test.py"],
    deps = [
        ":flags_parser",
        "//tensorboard:test",
    ],
)
