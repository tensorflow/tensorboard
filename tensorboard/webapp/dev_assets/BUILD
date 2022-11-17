# Build targets for building development webapp assets.
#
# This largely duplicates asset related targets in //tensorboard/webapp.
# Because we had to create `index.html` to be zippped by the
# tensorboard_zip_file which ends up having the same target name as
# //tensorboard/webapp:index.html, we had to create the dev_assets version in
# a different package. Once we can get rid of zip asset provider and a way to
# alias asset, we would not need the enitrely different Bazel package.
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
        "@npm//@angular/compiler",
        "@npm//@angular/localize",
    ],
)

tf_js_binary(
    name = "tb_webapp_binary",
    compile = True,
    dev_mode_only = True,
    entry_point = "main_dev.ts",
    deps = [":ng_main"],
)

tf_web_library(
    name = "tb_webapp",
    srcs = [
        ":tb_webapp_binary.js",
    ],
    path = "/tb-webapp",
)

tf_js_binary(
    name = "polymer3_lib_binary_no_shim_dev",
    compile = True,
    dev_mode_only = True,
    entry_point = "//tensorboard/components:polymer3_lib.ts",
    deps = ["//tensorboard/components:polymer3_ts_lib"],
)

# Keep in sync with //tensorboard/components:polymer3_lib_binary.
genrule(
    name = "polymer3_lib_binary_dev",
    srcs = [
        # Do not sort. order is important.
        "@npm//:node_modules/web-animations-js/web-animations-next-lite.min.js",
        ":polymer3_lib_binary_no_shim_dev.js",
    ],
    outs = ["polymer3_lib_binary_dev.js"],
    cmd = "for f in $(SRCS); do cat \"$$f\"; echo; done > $@",
)

# The index.html used for dev mode needs to use the polymer3 lib specifically
# for dev mode.
genrule(
    name = "rename_index_html",
    srcs = ["//tensorboard/webapp:index_polymer3.inlined.html"],
    outs = ["index.html"],
    cmd = "sed 's/polymer3_lib_binary\\.js/polymer3_lib_binary_dev\\.js/g' $(SRCS) > $@",
)

# Should keep the asset dependencies in sync with //tensorboard:assets.
tf_web_library(
    name = "dev_assets",
    srcs = [
        ":index.html",
        ":polymer3_lib_binary_dev.js",
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
