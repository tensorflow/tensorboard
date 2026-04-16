workspace(name = "org_tensorflow_tensorboard")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("@bazel_tools//tools/build_defs/repo:java.bzl", "java_import_external")
load("@bazel_tools//tools/build_defs/repo:local.bzl", "local_repository")
load("//third_party:repo.bzl", "tb_http_archive", "tb_mirror_urls")

http_archive(
    name = "bazel_skylib",
    sha256 = "07b4117379dde7ab382345c3b0f5edfc6b7cff6c93756eac63da121e0bbcc5de",
    strip_prefix = "bazel-skylib-1.1.1",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/bazel-skylib/archive/1.1.1.tar.gz",
        "https://github.com/bazelbuild/bazel-skylib/releases/download/1.1.1/bazel-skylib-1.1.1.tar.gz",  # 2021-09-27
    ],
)

load("@bazel_skylib//lib:versions.bzl", "versions")

versions.check(
    # Preemptively assume the next Bazel major version will break us, since historically they do,
    # and provide a clean error message in that case. Since the maximum version is inclusive rather
    # than exclusive, we set it to the 999th patch release of the current major version.
    maximum_bazel_version = "7.999.0",
    # Keep this version in sync with:
    #  * The BAZEL environment variable defined in .github/workflows/ci.yml, which is used for CI and nightly builds.
    minimum_bazel_version = "7.7.0",
)

http_archive(
    name = "io_bazel_rules_webtesting",
    sha256 = "6e104e54c283c94ae3d5c6573cf3233ce478e89e0f541a869057521966a35b8f",
    strip_prefix = "rules_webtesting-b6fc79c5a37cd18a5433fd080c9d2cc59548222c",
    urls = ["https://github.com/bazelbuild/rules_webtesting/archive/b6fc79c5a37cd18a5433fd080c9d2cc59548222c.tar.gz"],
)

load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories(omit_bazel_skylib = True)

http_archive(
    name = "io_bazel_rules_go",
    sha256 = "278b7ff5a826f3dc10f04feaf0b70d48b68748ccd512d7f98bf442077f043fe3",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_go/releases/download/v0.41.0/rules_go-v0.41.0.zip",
        "https://github.com/bazelbuild/rules_go/releases/download/v0.41.0/rules_go-v0.41.0.zip",
    ],
)

load("@io_bazel_rules_go//go:deps.bzl", "go_register_toolchains", "go_rules_dependencies")

go_rules_dependencies()

go_register_toolchains(version = "1.20.5")

http_archive(
    name = "bazel_gazelle",
    sha256 = "29218f8e0cebe583643cbf93cae6f971be8a2484cdcfa1e45057658df8d54002",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/bazel-gazelle/releases/download/v0.32.0/bazel-gazelle-v0.32.0.tar.gz",
        "https://github.com/bazelbuild/bazel-gazelle/releases/download/v0.32.0/bazel-gazelle-v0.32.0.tar.gz",
    ],
)

load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies")

gazelle_dependencies()

# rules_python has to be placed before load("@io_bazel_rules_closure//closure:repositories.bzl")
# in the dependencies list, otherwise we get "cannot load '@rules_python//python:py_xxx.bzl': no such file"
http_archive(
    name = "rules_python",
    sha256 = "0a8003b044294d7840ac7d9d73eef05d6ceb682d7516781a4ec62eeb34702578",
    strip_prefix = "rules_python-0.24.0",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_python/releases/download/0.24.0/rules_python-0.24.0.tar.gz",
        "https://github.com/bazelbuild/rules_python/releases/download/0.24.0/rules_python-0.24.0.tar.gz",  # 2023-07-11
    ],
)

load("@io_bazel_rules_webtesting//web:py_repositories.bzl", "py_repositories")

py_repositories()

http_archive(
    name = "io_bazel_rules_closure",
    patch_args = ["-p1"],
    patches = ["//patches:rules_closure_soy_cli.patch"],
    sha256 = "ae060075a7c468eee42e6a08ddbb83f5a6663bdfdbd461261a465f4a3ae8598c",
    strip_prefix = "rules_closure-7f3d3351a8cc31fbaa403de7d35578683c17b447",
    urls = [
        "https://github.com/bazelbuild/rules_closure/archive/7f3d3351a8cc31fbaa403de7d35578683c17b447.tar.gz",  # 2024-03-11
    ],
)

local_repository(
    name = "com_google_common_html_types",
    path = "third_party/safe_html_types",
)

# rules_closure's Soy toolchain still expects safe-html-types classes that are
# compatible with protobuf-java 6.x. Vendor the adjusted library locally so the
# Bazel 7 / protobuf 6 upgrade does not depend on older transitive jars.

java_import_external(
    name = "com_google_flogger_flogger",
    jar_sha256 = "b5ecd1483e041197012786f749968a62063c1964d3ecfbf96ba92a95797bb8f5",
    jar_urls = [
        "http://mirror.tensorflow.org/repo1.maven.org/maven2/com/google/flogger/flogger/0.5.1/flogger-0.5.1.jar",
        "https://repo1.maven.org/maven2/com/google/flogger/flogger/0.5.1/flogger-0.5.1.jar",
    ],
    licenses = ["notice"],
)

java_import_external(
    name = "com_google_flogger_google_extensions",
    jar_sha256 = "8b0862cad85b9549f355fe383c6c63816d2f19529634e033ae06d0107ab110b9",
    jar_urls = [
        "http://mirror.tensorflow.org/repo1.maven.org/maven2/com/google/flogger/google-extensions/0.5.1/google-extensions-0.5.1.jar",
        "https://repo1.maven.org/maven2/com/google/flogger/google-extensions/0.5.1/google-extensions-0.5.1.jar",
    ],
    licenses = ["notice"],
    deps = ["@com_google_flogger_flogger"],
)

java_import_external(
    name = "com_google_flogger_flogger_system_backend",
    jar_sha256 = "685de33b53eb313049bbeee7f4b7a80dd09e8e754e96b048a3edab2cebb36442",
    jar_urls = [
        "http://mirror.tensorflow.org/repo1.maven.org/maven2/com/google/flogger/flogger-system-backend/0.5.1/flogger-system-backend-0.5.1.jar",
        "https://repo1.maven.org/maven2/com/google/flogger/flogger-system-backend/0.5.1/flogger-system-backend-0.5.1.jar",
    ],
    licenses = ["notice"],
    deps = ["@com_google_flogger_flogger"],
)

java_import_external(
    name = "com_google_template_soy",
    extra_build_file_content = "\n".join([
        ("java_binary(\n" +
         "    name = \"%s\",\n" +
         "    main_class = \"com.google.template.soy.%s\",\n" +
         "    output_licenses = [\"unencumbered\"],\n" +
         "    runtime_deps = [\":com_google_template_soy\"],\n" +
         ")\n") % (name, name)
        for name in (
            "SoyParseInfoGenerator",
            "SoyToJbcSrcCompiler",
            "SoyToJsSrcCompiler",
            "SoyToPySrcCompiler",
        )
    ]),
    jar_sha256 = "643440022e247ef8ad25bacb83ba099ccd2ae4b1fd078d9e9e3d3dd4af00411f",
    jar_urls = [
        "https://repo1.maven.org/maven2/com/google/template/soy/2022-03-07/soy-2022-03-07.jar",
    ],
    licenses = ["notice"],
    deps = [
        "@args4j",
        "@com_google_code_findbugs_jsr305",
        "@com_google_code_gson",
        "@com_google_common_html_types",
        "@com_google_flogger_flogger",
        "@com_google_flogger_flogger_system_backend",
        "@com_google_flogger_google_extensions",
        "@com_google_guava",
        "@com_google_inject_extensions_guice_assistedinject",
        "@com_google_inject_extensions_guice_multibindings",
        "@com_google_inject_guice",
        "@com_google_protobuf//:protobuf_java",
        "@com_ibm_icu_icu4j",
        "@javax_inject",
        "@org_json",
        "@org_ow2_asm",
        "@org_ow2_asm_analysis",
        "@org_ow2_asm_commons",
        "@org_ow2_asm_util",
    ],
)

load("@io_bazel_rules_closure//closure:repositories.bzl", "rules_closure_dependencies")

rules_closure_dependencies(
    omit_bazel_skylib = True,
    omit_com_google_common_html_types = True,
    omit_com_google_protobuf = True,
    omit_com_google_protobuf_js = True,
    omit_com_google_template_soy = True,
)

http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "f02557f31d4110595ca6e93660018bcd7fdfdbe7d0086089308f1b3af3a7a7ee",
    urls = [
        "https://github.com/bazelbuild/rules_nodejs/releases/download/5.8.1/rules_nodejs-5.8.1.tar.gz",
    ],
)

load("@build_bazel_rules_nodejs//:repositories.bzl", "build_bazel_rules_nodejs_dependencies")

build_bazel_rules_nodejs_dependencies()

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories", "yarn_install")

# Angular 17 needs Node.js 18.17 or higher. rules_nodejs 5.8.1 does not
# include Node 18, so we add it here manually.
# @TODO(@cdavalos7): We plan to upgrade to a newer version of rules_nodejs that includes Node 18 and remove this manual addition in next version upgrade.
node_repositories(
    node_repositories = {
        "18.20.8-darwin_arm64": ("node-v18.20.8-darwin-arm64.tar.gz", "node-v18.20.8-darwin-arm64", "bae4965d29d29bd32f96364eefbe3bca576a03e917ddbb70b9330d75f2cacd76"),
        "18.20.8-darwin_amd64": ("node-v18.20.8-darwin-x64.tar.gz", "node-v18.20.8-darwin-x64", "ed2554677188f4afc0d050ecd8bd56effb2572d6518f8da6d40321ede6698509"),
        "18.20.8-linux_arm64": ("node-v18.20.8-linux-arm64.tar.xz", "node-v18.20.8-linux-arm64", "224e569dbe7b0ea4628ce383d9d482494b57ee040566583f1c54072c86d1116b"),
        "18.20.8-linux_amd64": ("node-v18.20.8-linux-x64.tar.xz", "node-v18.20.8-linux-x64", "5467ee62d6af1411d46b6a10e3fb5cacc92734dbcef465fea14e7b90993001c9"),
        "18.20.8-windows_amd64": ("node-v18.20.8-win-x64.zip", "node-v18.20.8-win-x64", "1a1e40260a6facba83636e4cd0ba01eb5bd1386896824b36645afba44857384a"),
    },
    node_version = "18.20.8",
)

yarn_install(
    name = "npm",
    # "Some rules only work by referencing labels nested inside npm packages
    # and therefore require turning off exports_directories_only."
    # This includes "ts_library".
    # See: https://github.com/bazelbuild/rules_nodejs/wiki/Migrating-to-5.0#exports_directories_only
    exports_directories_only = False,
    package_json = "//:package.json",
    package_json_remove = ["scripts.postinstall"],
    patch_args = ["-p1"],
    # Under Bazel 7.7.0 on this stack, invoking patch-package from the
    # repository rule is fragile. Apply the existing git-format patches
    # directly in yarn_install instead.
    post_install_patches = [
        "//patches:@angular+build-tooling+0.0.0-7d103b83a07f132629592fc9918ce17d42a5e382.patch",
        "//patches:@bazel+concatjs+5.7.0.patch",
    ],
    yarn_lock = "//:yarn.lock",
)

# Load esbuild rules for bazel.
# https://bazelbuild.github.io/rules_nodejs/esbuild.html
load("@build_bazel_rules_nodejs//toolchains/esbuild:esbuild_repositories.bzl", "esbuild_repositories")

esbuild_repositories(npm_repository = "npm")

# rules_sass release information is difficult to find but it does seem to
# regularly release with same cadence and version as core sass.
# We typically upgrade this library whenever we upgrade rules_nodejs.
#
# rules_sass 1.55.0: https://github.com/bazelbuild/rules_sass/tree/1.55.0
http_archive(
    name = "io_bazel_rules_sass",
    sha256 = "1ea0103fa6adcb7d43ff26373b5082efe1d4b2e09c4f34f8a8f8b351e9a8a9b0",
    strip_prefix = "rules_sass-1.55.0",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_sass/archive/1.55.0.zip",
        "https://github.com/bazelbuild/rules_sass/archive/1.55.0.zip",
    ],
)

load("@io_bazel_rules_sass//:defs.bzl", "sass_repositories")

sass_repositories()

# This dependency specifies the version of protobuf that will be used to compile
# protos as part of TensorBoard's build (i.e., the protoc version).
#
# The generated Python code for those protos relies on a Python runtime library,
# which is provided by the `protobuf` pip package. To ensure compatibility, the
# protoc version must be <= the runtime version. In our case, that means we must
# set the minimum `protobuf` version in our requirements.txt to be at least as
# high as the version of protobuf we depend on below, and we cannot increase the
# version below without bumping the requirements.txt version.
#
# TensorFlow 2.21 uses protobuf 6.31.1 in its own build and pip package
# constraints. Keep this Bazel-side protoc version aligned with that runtime
# floor so generated Python code and the ambient `protobuf` package remain
# compatible.
tb_http_archive(
    name = "tb_rules_cc",
    patch_file = ["//patches:rules_cc_protobuf.patch"],
    repo_mapping = {
        "@rules_cc": "@tb_rules_cc",
    },
    sha256 = "4b12149a041ddfb8306a8fd0e904e39d673552ce82e4296e96fac9cbf0780e59",
    strip_prefix = "rules_cc-0.1.0",
    urls = tb_mirror_urls("https://github.com/bazelbuild/rules_cc/archive/refs/tags/0.1.0.tar.gz"),
)

tb_http_archive(
    name = "tb_rules_java",
    sha256 = "b2519fabcd360529071ade8732f208b3755489ed7668b118f8f90985c0e51324",
    strip_prefix = "rules_java-8.6.1",
    urls = tb_mirror_urls("https://github.com/bazelbuild/rules_java/archive/refs/tags/8.6.1.tar.gz"),
)

local_repository(
    name = "compatibility_proxy",
    path = "third_party/compatibility_proxy",
)

local_repository(
    name = "protobuf_pip_deps",
    path = "third_party/protobuf_pip_deps",
)

local_repository(
    name = "protobuf_pip_deps_setuptools",
    path = "third_party/protobuf_pip_deps_setuptools",
)

load("@tb_rules_java//java:rules_java_deps.bzl", "rules_java_dependencies")

tb_http_archive(
    name = "com_google_absl",
    repo_mapping = {
        "@rules_cc": "@tb_rules_cc",
    },
    sha256 = "d8ae9aa794a571ee39c77085ee69f1d4ac276212a7d99734974d95df7baa8d13",
    strip_prefix = "abseil-cpp-9ac7062b1860d895fb5a8cbf58c3e9ef8f674b5f",
    urls = tb_mirror_urls("https://github.com/abseil/abseil-cpp/archive/9ac7062b1860d895fb5a8cbf58c3e9ef8f674b5f.zip"),
)

tb_http_archive(
    name = "com_google_protobuf",
    patch_file = ["//patches:protobuf_6_31_1_java_export.patch"],
    repo_mapping = {
        "@abseil-cpp": "@com_google_absl",
        "@rules_cc": "@tb_rules_cc",
        "@rules_java": "@tb_rules_java",
    },
    sha256 = "6e09bbc950ba60c3a7b30280210cd285af8d7d8ed5e0a6ed101c72aff22e8d88",
    strip_prefix = "protobuf-6.31.1",
    urls = tb_mirror_urls("https://github.com/protocolbuffers/protobuf/archive/refs/tags/v6.31.1.zip"),
)

rules_java_dependencies()

load("@com_google_protobuf//:protobuf_deps.bzl", "protobuf_deps")

protobuf_deps()

# gRPC.
#
# Keep this aligned with TensorFlow 2.21's Bazel-side gRPC dependency so the
# grpc plugin and protobuf repository stay on a known-compatible combination.
tb_http_archive(
    name = "com_github_grpc_grpc",
    sha256 = "dd6a2fa311ba8441bbefd2764c55b99136ff10f7ea42954be96006a2723d33fc",
    strip_prefix = "grpc-1.74.0",
    urls = tb_mirror_urls("https://github.com/grpc/grpc/archive/refs/tags/v1.74.0.tar.gz"),
)

tb_http_archive(
    name = "build_bazel_rules_swift",
    sha256 = "9919ed1d8dae509645bfd380537ae6501528d8de971caebed6d5185b9970dc4d",
    urls = tb_mirror_urls("https://github.com/bazelbuild/rules_swift/releases/download/2.1.1/rules_swift.2.1.1.tar.gz"),
)

load("@com_github_grpc_grpc//bazel:grpc_deps.bzl", "grpc_deps")

grpc_deps()

http_archive(
    name = "rules_rust",
    sha256 = "08109dccfa5bbf674ff4dba82b15d40d85b07436b02e62ab27e0b894f45bb4a3",
    strip_prefix = "rules_rust-d5ab4143245af8b33d1947813d411a6cae838409",
    urls = [
        # Master branch as of 2022-01-31
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_rust/archive/d5ab4143245af8b33d1947813d411a6cae838409.tar.gz",
        "https://github.com/bazelbuild/rules_rust/archive/d5ab4143245af8b33d1947813d411a6cae838409.tar.gz",
    ],
)

load("@io_bazel_rules_webtesting//web:go_repositories.bzl", "go_internal_repositories", "go_repositories")

go_repositories()

go_internal_repositories()

# Please add all new dependencies in workspace.bzl.
load("//third_party:workspace.bzl", "tensorboard_workspace")

tensorboard_workspace()
