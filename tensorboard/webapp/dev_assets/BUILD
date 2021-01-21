load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ng_module")
load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:__pkg__"])

licenses(["notice"])

tf_ng_module(
    name = "ng_main",
    srcs = [
        "main_dev.ts",
    ],
    deps = [
        "//tensorboard/webapp:ng_main",
        "@npm//@angular/localize",
    ],
)

tf_js_binary(
    name = "tb_webapp_binary",
    compile = 1,
    entry_point = "main_dev.ts",
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

tf_web_library(
    name = "tb_webapp",
    srcs = [
        ":tb_webapp_binary.js",
    ],
    path = "/tb-webapp",
)

genrule(
    name = "rename_index_html",
    srcs = ["//tensorboard/webapp:index_polymer3.inlined.html"],
    outs = ["index.html"],
    cmd = "cat $(SRCS) > $@",
)

# Should keep the asset dependencies in sync with //tensorboard:assets.
tf_web_library(
    name = "dev_assets",
    srcs = [
        ":index.html",
        "//tensorboard/components:polymer3_lib_binary.js",
        "//tensorboard/webapp:styles.css",
        "//tensorboard/webapp:svg_bundle",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/worker:chart_worker.js",
    ],
    path = "/",
    deps = [
        ":tb_webapp",
        "//tensorboard/components/tf_imports:roboto",
        "//tensorboard/webapp/widgets/source_code/monaco:monaco_editor",
        "//tensorboard/webapp/widgets/source_code/monaco:monaco_languages",
        "//tensorboard/webapp/widgets/source_code/monaco:requirejs",
        "@com_google_fonts_roboto",
    ],
)
