"""Bzlmod repository setup for TensorBoard's transitional Node toolchain.

The TensorBoard frontend still consumes the ts_library and Karma APIs shipped
in rules_nodejs 5.8.1 npm packages. This extension moves their repository
creation out of WORKSPACE while preserving the existing @npm label contract.
"""

load("@build_bazel_rules_nodejs//:index.bzl", "node_repositories", "yarn_install")
load("@build_bazel_rules_nodejs//toolchains/esbuild:esbuild_repositories.bzl", "esbuild_repositories")

_NODE_REPOSITORIES = {
    "24.18.0-darwin_arm64": ("node-v24.18.0-darwin-arm64.tar.gz", "node-v24.18.0-darwin-arm64", "e1a97e14c99c803e96c7339403282ea05a499c32f8d83defe9ef5ec66f979ed1"),
    "24.18.0-darwin_amd64": ("node-v24.18.0-darwin-x64.tar.gz", "node-v24.18.0-darwin-x64", "dfd0dbd3e721503434df7b7205e719f61b3a3a31b2bcf9729b8b91fea240f080"),
    "24.18.0-linux_arm64": ("node-v24.18.0-linux-arm64.tar.xz", "node-v24.18.0-linux-arm64", "58c9520501f6ae2b52d5b210444e24b9d0c029a58c5011b797bc1fe7105886f6"),
    "24.18.0-linux_amd64": ("node-v24.18.0-linux-x64.tar.xz", "node-v24.18.0-linux-x64", "55aa7153f9d88f28d765fcdad5ae6945b5c0f98a36881703817e4c450fa76742"),
    "24.18.0-windows_amd64": ("node-v24.18.0-win-x64.zip", "node-v24.18.0-win-x64", "0ae68406b42d7725661da979b1403ec9926da205c6770827f33aac9d8f26e821"),
}

def _tensorboard_node_dependencies_impl(_module_ctx):
    # Module files register the generated toolchains explicitly. Repository
    # macros may not mutate the root module's toolchain registration.
    node_repositories(
        node_repositories = _NODE_REPOSITORIES,
        node_version = "24.18.0",
        register = False,
    )

    yarn_install(
        name = "npm",
        exports_directories_only = False,
        node_repository = "nodejs",
        package_json = Label("//:package.json"),
        package_json_remove = ["scripts.postinstall"],
        patch_args = ["-p1"],
        post_install_patches = [
            Label("//patches:@angular+build-tooling+0.0.0-98b30ab5fdeeb1df3278f5257b9a8f07abb76941.patch"),
            Label("//patches:@bazel+concatjs+5.8.1.patch"),
        ],
        yarn = Label("@yarn//:bin/yarn"),
        yarn_lock = Label("//:yarn.lock"),
    )

    esbuild_repositories(
        npm_repository = "npm",
        node_repository = "nodejs",
        register = False,
    )

tensorboard_node_dependencies = module_extension(
    implementation = _tensorboard_node_dependencies_impl,
)
