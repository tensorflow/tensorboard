"""Compatibility proxy for rules_java under Bazel 7."""

load("@bazel_tools//tools/build_defs/repo:http.bzl", _http_jar = "http_jar")
load("@tb_rules_java//java/private:native.bzl", "NativeJavaInfo", "NativeJavaPluginInfo", "native_java_common")

java_binary = native.java_binary
java_import = native.java_import
java_library = native.java_library
java_plugin = native.java_plugin
java_test = native.java_test

java_package_configuration = native.java_package_configuration
java_runtime = native.java_runtime
java_toolchain = native.java_toolchain

java_common = native_java_common
JavaInfo = NativeJavaInfo
JavaPluginInfo = NativeJavaPluginInfo
java_common_internal_compile = None
java_info_internal_merge = None

http_jar = _http_jar
