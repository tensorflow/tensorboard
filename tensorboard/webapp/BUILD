load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ng_web_test_suite", "tf_sass_binary", "tf_sass_library", "tf_svg_bundle")
load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

# Angular module for the top-level app component together with all of its
# injectable dependencies.  I.e., the entire Angular app.
ng_module(
    name = "app",
    srcs = [
        "app_container.ts",
        "app_module.ts",
        "mat_icon_module.ts",
        "reducer_config.ts",
    ],
    assets = [
        "app_container.css",
        "app_container.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/views:hash_storage",
        "//tensorboard/webapp/feature_flag",
        "//tensorboard/webapp/header",
        "//tensorboard/webapp/plugins",
        "//tensorboard/webapp/reloader",
        "//tensorboard/webapp/runs",
        "//tensorboard/webapp/settings",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

ng_module(
    name = "app_state",
    srcs = [
        "app_state.ts",
    ],
    deps = [
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/feature_flag/store:types",
    ],
)

# TODO(stephanwlee): at the moment, there is no development build. Reinstate it.
# Wrapper that prepares Angular app for deployment, dealing with browser
# compatibility, Vulcanization, and configuration (e.g. prod vs. dev).
ng_module(
    name = "ng_main",
    srcs = [
        "bootstrap.ts",
        "main_prod.ts",
    ],
    deps = [
        ":app",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@angular/router",
        "@npm//zone.js",
    ],
)

# Compile the prepared Angular app to a JS binary.
tf_js_binary(
    name = "tb_webapp_binary",
    compile = 1,
    entry_point = "main_prod.ts",
    deps = [
        ":ng_main",
        "//tensorboard/webapp/angular:expect_angular_material_tabs",
        "//tensorboard/webapp/angular:expect_angular_material_toolbar",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/material",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//rxjs",
        "@npm//zone.js",
    ],
)

# Wrap the Angular app JS binary as a library.
tf_web_library(
    name = "tb_webapp",
    srcs = [
        ":tb_webapp_binary.js",
    ],
    path = "/tb-webapp",
    deps = [
        ":tb_webapp_binary",
    ],
)

# Bundle the Angular app with the Polymer components and plugins, as a library.
tf_web_library(
    name = "tensorboard-webapp",
    srcs = [
        "index.inlined.html",
        ":styles.css",
    ],
    path = "/",
    deps = [
        ":tb_webapp",
        "//tensorboard/components:polymer_lib_binary",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/source_code/monaco:requirejs",
    ],
)

genrule(
    name = "gen_index.html",
    srcs = ["index.uninlined.html"],
    outs = ["index.inlined.html"],
    cmd = "$(execpath //tensorboard/logo:inline_favicon) $< >$@",
    tools = ["//tensorboard/logo:inline_favicon"],
)

# A Vulcanized html binary for the complete app (both Angular and Polymer parts)
tensorboard_html_binary(
    name = "index",
    input_path = "/index.inlined.html",
    js_path = "/index.js",
    output_path = "/index.html",
    deps = [":tensorboard-webapp"],
)

# Karma has overhead of bootstrap/tearDown. Combine as much testcases
# as possible into one test target and use test sharding to speed up.
tf_ng_web_test_suite(
    name = "karma_test",
    deps = [
        "//tensorboard/webapp/core/effects:core_effects_test_lib",
        "//tensorboard/webapp/core/store:core_store_test_lib",
        "//tensorboard/webapp/core/views:test_lib",
        "//tensorboard/webapp/deeplink:deeplink_test_lib",
        "//tensorboard/webapp/feature_flag/effects:effects_test_lib",
        "//tensorboard/webapp/feature_flag/store:store_test_lib",
        "//tensorboard/webapp/header:test_lib",
        "//tensorboard/webapp/plugins:plugins_container_test_lib",
        "//tensorboard/webapp/reloader:test_lib",
        "//tensorboard/webapp/settings:test_lib",
        "//tensorboard/webapp/tbdev_upload:test_lib",
        "//tensorboard/webapp/webapp_data_source:feature_flag_test_lib",
        "//tensorboard/webapp/webapp_data_source:webapp_data_source_test_lib",
    ],
)

tf_svg_bundle(
    name = "svg_bundle",
    srcs = [
        # When modifying below, please make sure to update
        # //tensorboard/webapp/testing/mat_icon.module.ts.
        "@com_google_material_design_icon//:content_copy_24px.svg",
        "@com_google_material_design_icon//:help_outline_24px.svg",
        "@com_google_material_design_icon//:info_outline_24px.svg",
        "@com_google_material_design_icon//:refresh_24px.svg",
        "@com_google_material_design_icon//:settings_24px.svg",
    ],
    out = "icon_bundle.svg",
)

tf_sass_library(
    name = "angular_material_theming",
    srcs = [
        "_angular_material_theming.scss",
        "@npm//:node_modules/@angular/material/_theming.scss",
    ],
)

# TODO(stephanwlee): remove the alias when all usages, internal, too,
# //tensorboard/webapp:theme are removed.
alias(
    name = "theme",
    actual = "//tensorboard/webapp/theme",
)

tf_sass_binary(
    name = "styles",
    src = "styles.scss",
)
