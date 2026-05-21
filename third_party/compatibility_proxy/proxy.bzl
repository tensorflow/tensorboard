"""Compatibility proxy for rules_java under Bazel 7.

This file re-exports the small subset of Java rules/providers that TensorBoard
needs through stable names expected by older call sites. It keeps the Bazel 7
rules_java transition localized to one place instead of rewriting every user.
"""

load("@bazel_tools//tools/build_defs/repo:http.bzl", _http_jar = "http_jar")
load("@tb_rules_java//java/private:native.bzl", "NativeJavaInfo", "NativeJavaPluginInfo", "native_java_common")

# Mirror the public java rule names consumed by existing WORKSPACE files.
java_binary = native.java_binary
java_import = native.java_import
java_library = native.java_library
java_plugin = native.java_plugin
java_test = native.java_test

java_package_configuration = native.java_package_configuration
java_runtime = native.java_runtime
java_toolchain = native.java_toolchain

# Re-export the provider symbols and java_common entry points that older
# consumers expect to find from the legacy rules_java surface.
java_common = native_java_common
JavaInfo = NativeJavaInfo
JavaPluginInfo = NativeJavaPluginInfo
java_common_internal_compile = None
java_info_internal_merge = None

http_jar = _http_jar
