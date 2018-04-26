# Description:
#   Import of html5lib library.

package(default_visibility = ["//visibility:public"])

licenses(["notice"])  # BSD-like notice-style license, see LICENSE file

exports_files(["LICENSE"])

py_library(
    name = "org_html5lib",
    srcs = [
        "html5lib/__init__.py",
        "html5lib/constants.py",
        "html5lib/filters/__init__.py",
        "html5lib/filters/_base.py",
        "html5lib/filters/alphabeticalattributes.py",
        "html5lib/filters/inject_meta_charset.py",
        "html5lib/filters/lint.py",
        "html5lib/filters/optionaltags.py",
        "html5lib/filters/sanitizer.py",
        "html5lib/filters/whitespace.py",
        "html5lib/html5parser.py",
        "html5lib/ihatexml.py",
        "html5lib/inputstream.py",
        "html5lib/sanitizer.py",
        "html5lib/serializer/__init__.py",
        "html5lib/serializer/htmlserializer.py",
        "html5lib/tokenizer.py",
        "html5lib/treeadapters/__init__.py",
        "html5lib/treeadapters/sax.py",
        "html5lib/treebuilders/__init__.py",
        "html5lib/treebuilders/_base.py",
        "html5lib/treebuilders/dom.py",
        "html5lib/treebuilders/etree.py",
        "html5lib/treebuilders/etree_lxml.py",
        "html5lib/treewalkers/__init__.py",
        "html5lib/treewalkers/_base.py",
        "html5lib/treewalkers/dom.py",
        "html5lib/treewalkers/etree.py",
        "html5lib/treewalkers/genshistream.py",
        "html5lib/treewalkers/lxmletree.py",
        "html5lib/treewalkers/pulldom.py",
        "html5lib/trie/__init__.py",
        "html5lib/trie/_base.py",
        "html5lib/trie/datrie.py",
        "html5lib/trie/py.py",
        "html5lib/utils.py",
    ],
    srcs_version = "PY2AND3",
    deps = ["@org_pythonhosted_six"],
)
