workspace(name = "org_tensorflow_tensorboard")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "bazel_skylib",
    sha256 = "2c62d8cd4ab1e65c08647eb4afe38f51591f43f7f0885e7769832fa137633dcb",
    strip_prefix = "bazel-skylib-0.7.0",
    urls = [
        # tag 0.7.0 resolves to commit 6741f733227dc68137512161a5ce6fcf283e3f58 (2019-02-08 18:37:26 +0100)
        "http://mirror.tensorflow.org/github.com/bazelbuild/bazel-skylib/archive/0.7.0.tar.gz",
        "https://github.com/bazelbuild/bazel-skylib/archive/0.7.0.tar.gz",
    ],
)

load("@bazel_skylib//lib:versions.bzl", "versions")
# Keep this version in sync with the BAZEL environment variable defined
# in our .travis.yml config.
versions.check(minimum_bazel_version = "0.26.1")

http_archive(
    name = "io_bazel_rules_webtesting",
    sha256 = "f89ca8e91ac53b3c61da356c685bf03e927f23b97b086cc593db8edc088c143f",
    urls = [
        # tag 0.3.1 resolves to commit afa8c4435ed8fd832046dab807ef998a26779ecb (2019-04-03 14:10:32 -0700)
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_webtesting/releases/download/0.3.1/rules_webtesting.tar.gz",
        "https://github.com/bazelbuild/rules_webtesting/releases/download/0.3.1/rules_webtesting.tar.gz",
    ],
)

load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")
web_test_repositories()

load("@io_bazel_rules_webtesting//web:py_repositories.bzl", "py_repositories")
py_repositories()

http_archive(
    name = "io_bazel_rules_closure",
    sha256 = "9b99615f73aa574a2947226c6034a6f7c319e1e42905abc4dc30ddbbb16f4a31",
    strip_prefix = "rules_closure-4a79cc6e6eea5e272fe615db7c98beb8cf8e7eb5",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_closure/archive/4a79cc6e6eea5e272fe615db7c98beb8cf8e7eb5.tar.gz",
        "https://github.com/bazelbuild/rules_closure/archive/4a79cc6e6eea5e272fe615db7c98beb8cf8e7eb5.tar.gz",  # 2019-09-16
    ],
)

load("@io_bazel_rules_closure//closure:repositories.bzl", "rules_closure_dependencies")
rules_closure_dependencies(
    omit_com_google_protobuf = True,
    omit_com_google_protobuf_js = True,
)

http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "7c4a690268be97c96f04d505224ec4cb1ae53c2c2b68be495c9bd2634296a5cd",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.34.0/rules_nodejs-0.34.0.tar.gz"],
)

load("@build_bazel_rules_nodejs//:defs.bzl", "node_repositories", "yarn_install")
node_repositories()

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
    # Opt out of symlinking local node_modules folder into bazel internal
    # directory.  Symlinking is incompatible with our toolchain which often
    # removes source directory without `bazel clean` which creates broken
    # symlink into node_modules folder.
    symlink_node_modules = False,
    data = [
        # package.json contains postinstall that requires this file.
        "//:angular-metadata.tsconfig.json",
    ],
)

load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")

install_bazel_dependencies()

http_archive(
    name = "org_tensorflow",
    # NOTE: when updating this, MAKE SURE to also update the protobuf_js runtime version
    # in third_party/workspace.bzl to >= the protobuf/protoc version provided by TF.
    sha256 = "48ddba718da76df56fd4c48b4bbf4f97f254ba269ec4be67f783684c75563ef8",
    strip_prefix = "tensorflow-2.0.0-rc0",
    urls = [
        "http://mirror.tensorflow.org/github.com/tensorflow/tensorflow/archive/v2.0.0-rc0.tar.gz",  # 2019-08-23
        "https://github.com/tensorflow/tensorflow/archive/v2.0.0-rc0.tar.gz",
    ],
)

load("@org_tensorflow//tensorflow:workspace.bzl", "tf_workspace")
tf_workspace()

# Please add all new dependencies in workspace.bzl.
load("//third_party:workspace.bzl", "tensorboard_workspace")
tensorboard_workspace()
