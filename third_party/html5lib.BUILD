# Description:
#   Import of html5lib library.

load("@rules_python//python:py_library.bzl", "py_library")

package(default_visibility = ["//visibility:public"])

licenses(["notice"])  # BSD-like notice-style license, see LICENSE file

exports_files(["LICENSE"])

py_library(
    name = "org_html5lib",
    srcs = [
        "html5lib/__init__.py",
        "html5lib/_ihatexml.py",
        "html5lib/_inputstream.py",
        "html5lib/_tokenizer.py",
        "html5lib/_trie/__init__.py",
        "html5lib/_trie/_base.py",
        "html5lib/_trie/py.py",
        "html5lib/_utils.py",
        "html5lib/constants.py",
        "html5lib/filters/__init__.py",
        "html5lib/filters/alphabeticalattributes.py",
        "html5lib/filters/base.py",
        "html5lib/filters/inject_meta_charset.py",
        "html5lib/filters/lint.py",
        "html5lib/filters/optionaltags.py",
        "html5lib/filters/sanitizer.py",
        "html5lib/filters/whitespace.py",
        "html5lib/html5parser.py",
        "html5lib/serializer.py",
        "html5lib/treeadapters/__init__.py",
        "html5lib/treeadapters/genshi.py",
        "html5lib/treeadapters/sax.py",
        "html5lib/treebuilders/__init__.py",
        "html5lib/treebuilders/base.py",
        "html5lib/treebuilders/dom.py",
        "html5lib/treebuilders/etree.py",
        "html5lib/treebuilders/etree_lxml.py",
        "html5lib/treewalkers/__init__.py",
        "html5lib/treewalkers/base.py",
        "html5lib/treewalkers/dom.py",
        "html5lib/treewalkers/etree.py",
        "html5lib/treewalkers/etree_lxml.py",
        "html5lib/treewalkers/genshi.py",
    ],
    srcs_version = "PY3",
    deps = [
        "@org_pythonhosted_six",
        "@org_pythonhosted_webencodings",
    ],
)
