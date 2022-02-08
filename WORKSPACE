workspace(name = "org_tensorflow_tensorboard")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

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

# Keep this version in sync with the BAZEL environment variable defined
# in our .github/workflows/ci.yml config.
versions.check(minimum_bazel_version = "4.0.0")

http_archive(
    name = "io_bazel_rules_webtesting",
    sha256 = "9bb461d5ef08e850025480bab185fd269242d4e533bca75bfb748001ceb343c3",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_webtesting/releases/download/0.3.3/rules_webtesting.tar.gz",
        "https://github.com/bazelbuild/rules_webtesting/releases/download/0.3.3/rules_webtesting.tar.gz",
    ],
)

load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories(omit_bazel_skylib = True)

load("@io_bazel_rules_webtesting//web:py_repositories.bzl", "py_repositories")

py_repositories()

http_archive(
    name = "io_bazel_rules_closure",
    sha256 = "6a900831c1eb8dbfc9d6879b5820fd614d4ea1db180eb5ff8aedcb75ee747c1f",
    strip_prefix = "rules_closure-db4683a2a1836ac8e265804ca5fa31852395185b",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_closure/archive/db4683a2a1836ac8e265804ca5fa31852395185b.tar.gz",
        "https://github.com/bazelbuild/rules_closure/archive/db4683a2a1836ac8e265804ca5fa31852395185b.tar.gz",  # 2020-01-15
    ],
)

load("@io_bazel_rules_closure//closure:repositories.bzl", "rules_closure_dependencies")

rules_closure_dependencies(
    omit_bazel_skylib = True,
    omit_com_google_protobuf = True,
    omit_com_google_protobuf_js = True,
)

http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "1134ec9b7baee008f1d54f0483049a97e53a57cd3913ec9d6db625549c98395a",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_nodejs/releases/download/3.4.0/rules_nodejs-3.4.0.tar.gz",
        "https://github.com/bazelbuild/rules_nodejs/releases/download/3.4.0/rules_nodejs-3.4.0.tar.gz",
    ],
)

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories", "yarn_install")

node_repositories(
    node_version = "12.21.0",
)

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    # Opt out of symlinking local node_modules folder into bazel internal
    # directory.  Symlinking is incompatible with our toolchain which often
    # removes source directory without `bazel clean` which creates broken
    # symlink into node_modules folder.
    symlink_node_modules = False,
    yarn_lock = "//:yarn.lock",
)

http_archive(
    name = "io_bazel_rules_sass",
    sha256 = "60fa023fe694848acf769d816ad9fee970a27a37489aaf5443a7ccffaac805e9",
    strip_prefix = "rules_sass-1.38.2",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_sass/archive/1.38.2.zip",
        "https://github.com/bazelbuild/rules_sass/archive/1.38.2.zip",
    ],
)

load("@io_bazel_rules_sass//:package.bzl", "rules_sass_dependencies")

rules_sass_dependencies()

load("@io_bazel_rules_sass//:defs.bzl", "sass_repositories")

sass_repositories()

# gRPC.
http_archive(
    name = "com_github_grpc_grpc",
    sha256 = "b2f2620c762427bfeeef96a68c1924319f384e877bc0e084487601e4cc6e434c",
    strip_prefix = "grpc-1.42.0",
    urls = [
        "http://mirror.tensorflow.org/github.com/grpc/grpc/archive/v1.42.0.tar.gz",
        "https://github.com/grpc/grpc/archive/v1.42.0.tar.gz",  # 2021-11-17
    ],
)

load("@com_github_grpc_grpc//bazel:grpc_deps.bzl", "grpc_deps")

grpc_deps()

load("@com_github_grpc_grpc//bazel:grpc_extra_deps.bzl", "grpc_extra_deps")

grpc_extra_deps()

http_archive(
    name = "com_google_protobuf",
    sha256 = "cfcba2df10feec52a84208693937c17a4b5df7775e1635c1e3baffc487b24c9b",
    strip_prefix = "protobuf-3.9.2",
    urls = [
        "http://mirror.tensorflow.org/github.com/protocolbuffers/protobuf/archive/v3.9.2.tar.gz",
        "https://github.com/protocolbuffers/protobuf/archive/v3.9.2.tar.gz",  # 2019-09-23
    ],
)

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

# Please add all new dependencies in workspace.bzl.
load("//third_party:workspace.bzl", "tensorboard_workspace")

tensorboard_workspace()
