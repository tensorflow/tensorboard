# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# TensorBoard Polymer Dependencies

load("@io_bazel_rules_closure//closure:defs.bzl", "web_library_external")

def tensorboard_polymer_workspace():
  web_library_external(
      name = "org_polymer",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "cf0d486e17ed8be8bb4d468564568ba7f1a23f217ed9995df31ca0c7c2a83dc2",
      strip_prefix = "polymer-1.11.3",
      urls = [
          "https://mirror.bazel.build/github.com/polymer/polymer/archive/v1.11.3.tar.gz",
          "https://github.com/polymer/polymer/archive/v1.11.3.tar.gz",
      ],
      path = "/polymer",
      srcs = [
          "LICENSE.txt",
          "polymer.html",
          "polymer-micro.html",
          "polymer-mini.html",
      ],
  )

  web_library_external(
      name = "org_polymer_hydrolysis",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "c404d453a31082c023457f2635ef4019bfd9e9fbb11c0d186ef55cda15bcab67",
      urls = [
          "https://mirror.bazel.build/github.com/Polymer/polymer-analyzer/archive/v1.24.1.tar.gz",
          "https://github.com/Polymer/polymer-analyzer/archive/v1.24.1.tar.gz",
      ],
      strip_prefix = "polymer-analyzer-1.24.1",
      path = "/hydrolysis",
      srcs = [
          "hydrolysis-analyzer.html",
          "hydrolysis.html",
          "hydrolysis.js",
      ],
      deps = ["@org_polymer"],
  )

  web_library_external(
      name = "org_polymer_iron_a11y_announcer",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "355f9a0b0509acbe9abb0aaab4cdd3d8621a56ca55a9bbf696dde9c68a2ff304",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-a11y-announcer/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/iron-a11y-announcer/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "iron-a11y-announcer-2.1.0",
      path = "/iron-a11y-announcer",
      srcs = ["iron-a11y-announcer.html"],
      deps = ["@org_polymer"],
  )

  web_library_external(
      name = "org_polymer_iron_a11y_keys_behavior",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "0cb94443c5277b2eb022bbf6f64d1573e087ed528f3ad39da40de5d6f51c3af0",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-a11y-keys-behavior/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/iron-a11y-keys-behavior/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "iron-a11y-keys-behavior-2.1.0",
      path = "/iron-a11y-keys-behavior",
      srcs = ["iron-a11y-keys-behavior.html"],
      deps = ["@org_polymer"],
  )

  web_library_external(
      name = "org_polymer_iron_ajax",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "80faddb20ac559d04fe32bf4d4652e2cf48bc0bb7567af665ebcabfafd85c557",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-ajax/archive/v2.1.3.tar.gz",
          "https://github.com/PolymerElements/iron-ajax/archive/v2.1.3.tar.gz",
      ],
      strip_prefix = "iron-ajax-2.1.3",
      path = "/iron-ajax",
      srcs = [
          "iron-ajax.html",
          "iron-request.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_promise_polyfill",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_autogrow_textarea",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "a6a20edde3621f6d99d5a1ec9f4ba499d02d9d8d74ddf95e29bf0966fc55e812",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-autogrow-textarea/archive/v2.2.0.tar.gz",
          "https://github.com/PolymerElements/iron-autogrow-textarea/archive/v2.2.0.tar.gz",
      ],
      strip_prefix = "iron-autogrow-textarea-2.2.0",
      path = "/iron-autogrow-textarea",
      srcs = ["iron-autogrow-textarea.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_behaviors",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_iron_form_element_behavior",
          "@org_polymer_iron_validatable_behavior",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_behaviors",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "71ecbe6a01bc302cdea01c80bf7b5801e1f570c88cc4ac491591e5cf19fdedfe",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-behaviors/archive/v2.1.1.tar.gz",
          "https://github.com/PolymerElements/iron-behaviors/archive/v2.1.1.tar.gz",
      ],
      strip_prefix = "iron-behaviors-2.1.1",
      path = "/iron-behaviors",
      srcs = [
          "iron-button-state.html",
          "iron-control-state.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_keys_behavior",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_checked_element_behavior",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "3037ede91593eb2880cf2e0c8d0198ae0b5802221e7386578263ab831a058bfc",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-checked-element-behavior/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/iron-checked-element-behavior/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "iron-checked-element-behavior-2.1.0",
      path = "/iron-checked-element-behavior",
      srcs = ["iron-checked-element-behavior.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_form_element_behavior",
          "@org_polymer_iron_validatable_behavior",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_component_page",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "d26b9bf200fedc76a9bac54da95e84b5d06b37598fdf99e18c3b943d737aff75",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-component-page/archive/v1.1.9.tar.gz",
          "https://github.com/PolymerElements/iron-component-page/archive/v1.1.9.tar.gz",
      ],
      strip_prefix = "iron-component-page-1.1.9",
      path = "/iron-component-page",
      srcs = ["iron-component-page.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_hydrolysis",
          "@org_polymer_iron_ajax",
          "@org_polymer_iron_doc_viewer",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_iron_icons",
          "@org_polymer_iron_selector",
          "@org_polymer_paper_header_panel",
          "@org_polymer_paper_styles",
          "@org_polymer_paper_toolbar",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_collapse",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "cad8c568ed26b2c3d67a5c63f53df709591b64b9f2aa724995a2d644a1076fea",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-collapse/archive/v2.2.0.tar.gz",
          "https://github.com/PolymerElements/iron-collapse/archive/v2.2.0.tar.gz",
      ],
      strip_prefix = "iron-collapse-2.2.0",
      path = "/iron-collapse",
      srcs = ["iron-collapse.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_resizable_behavior",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_demo_helpers",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "4e7c148fc35ad1b8d0cf90fca1bc535801513b4ed62953faf37a2d664100a27f",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-demo-helpers/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/iron-demo-helpers/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "iron-demo-helpers-2.1.0",
      path = "/iron-demo-helpers",
      srcs = [
          "demo-pages-shared-styles.html",
          "demo-snippet.html",
      ],
      deps = [
          "@org_polymer",
          "@com_google_fonts_roboto",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_iron_icons",
          "@org_polymer_marked_element",
          "@org_polymer_paper_icon_button",
          "@org_polymer_paper_styles",
          "@org_polymer_prism_element",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_doc_viewer",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "5d487c99dd0cf626c800ae8667b0c8c88095f4482a68e837a1d3f58484ca8fb4",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-doc-viewer/archive/v2.0.0.tar.gz",
          "https://github.com/PolymerElements/iron-doc-viewer/archive/v2.0.0.tar.gz",
      ],
      strip_prefix = "iron-doc-viewer-2.0.0",
      path = "/iron-doc-viewer",
      srcs = [
          "iron-doc-property-styles.html",
          "iron-doc-property.html",
          "iron-doc-viewer-styles.html",
          "iron-doc-viewer.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_marked_element",
          "@org_polymer_paper_button",
          "@org_polymer_paper_styles",
          "@org_polymer_prism_element",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_dropdown",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "f265bf731b96eee431d27d1639acfc5b1c76d5aade2bcf395a65fbcdbfae5ef4",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-dropdown/archive/v1.5.6.tar.gz",
          "https://github.com/PolymerElements/iron-dropdown/archive/v1.5.6.tar.gz",
      ],
      strip_prefix = "iron-dropdown-1.5.6",
      path = "/iron-dropdown",
      srcs = [
          "iron-dropdown.html",
          "iron-dropdown-scroll-manager.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_keys_behavior",
          "@org_polymer_iron_behaviors",
          "@org_polymer_iron_overlay_behavior",
          "@org_polymer_iron_resizable_behavior",
          "@org_polymer_neon_animation",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_fit_behavior",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "e0f6ee291103b64ca19e75e42afb0d4dcce87b60b5033a522cd9d2c0260486a7",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-fit-behavior/archive/v2.1.1.tar.gz",
          "https://github.com/PolymerElements/iron-fit-behavior/archive/v2.1.1.tar.gz",
      ],
      strip_prefix = "iron-fit-behavior-2.1.1",
      path = "/iron-fit-behavior",
      srcs = ["iron-fit-behavior.html"],
      deps = ["@org_polymer"],
  )

  web_library_external(
      name = "org_polymer_iron_flex_layout",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "2c147ed1e99870f44aa6e36ff718eee056e49417f64d0ca25caaed781d479ffc",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-flex-layout/archive/v2.0.3.tar.gz",
          "https://github.com/PolymerElements/iron-flex-layout/archive/v2.0.3.tar.gz",
      ],
      strip_prefix = "iron-flex-layout-2.0.3",
      path = "/iron-flex-layout",
      srcs = [
          # "classes/iron-flex-layout.html",  # Deprecated, but needed by paper-styles component.
          # "classes/iron-shadow-flex-layout.html",
          "iron-flex-layout.html",
          "iron-flex-layout-classes.html",
      ],
      deps = ["@org_polymer"],
  )

  web_library_external(
      name = "org_polymer_iron_form_element_behavior",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "c4541ac5f6c8f2677ab05fde9c5d911af58070e1b97f9d603fe489c40a10c1f0",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-form-element-behavior/archive/v2.1.1.tar.gz",
          "https://github.com/PolymerElements/iron-form-element-behavior/archive/v2.1.1.tar.gz",
      ],
      strip_prefix = "iron-form-element-behavior-2.1.1",
      path = "/iron-form-element-behavior",
      srcs = ["iron-form-element-behavior.html"],
      deps = ["@org_polymer"],
  )

  web_library_external(
      name = "org_polymer_iron_icon",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "5030eb65f935ee75bec682e71c6b55a421ff365f9f876f0e920080625fc63694",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-icon/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/iron-icon/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "iron-icon-2.1.0",
      path = "/iron-icon",
      srcs = ["iron-icon.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_iron_meta",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_icons",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "779174b4acd9ac8fbbb3e1bf81394db13189f294bd6683c4a0e79f68da8f1911",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-icons/archive/v2.1.1.tar.gz",
          "https://github.com/PolymerElements/iron-icons/archive/v2.1.1.tar.gz",
      ],
      strip_prefix = "iron-icons-2.1.1",
      path = "/iron-icons",
      srcs = [
          "av-icons.html",
          "communication-icons.html",
          "device-icons.html",
          "editor-icons.html",
          "hardware-icons.html",
          "image-icons.html",
          "iron-icons.html",
          "maps-icons.html",
          "notification-icons.html",
          "places-icons.html",
          "social-icons.html",
      ],
      deps = [
          "@org_polymer_iron_icon",
          "@org_polymer_iron_iconset_svg",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_iconset_svg",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "31c513ea52648d7b6e716909fea5921272e6244bd560c23571eb2a50e37694de",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-iconset-svg/archive/v2.2.0.tar.gz",
          "https://github.com/PolymerElements/iron-iconset-svg/archive/v2.2.0.tar.gz",
      ],
      strip_prefix = "iron-iconset-svg-2.2.0",
      path = "/iron-iconset-svg",
      srcs = ["iron-iconset-svg.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_meta",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_image",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "11347e6ba6d73bfddb93e3188e61019c40ef150e03e916a5f8e1c1ac0d3b1f0e",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-image/archive/v1.2.6.tar.gz",
          "https://github.com/PolymerElements/iron-image/archive/v1.2.6.tar.gz",
      ],
      strip_prefix = "iron-image-1.2.6",
      path = "/iron-image",
      srcs = ["iron-image.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_flex_layout",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_input",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "e26c49cfa8f013d09d6cc45f6ca76b390ebbe5baea4755d2d0900df083d5ae44",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-input/archive/v1.0.11.tar.gz",
          "https://github.com/PolymerElements/iron-input/archive/v1.0.11.tar.gz",
      ],
      strip_prefix = "iron-input-1.0.11",
      path = "/iron-input",
      srcs = ["iron-input.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_announcer",
          "@org_polymer_iron_validatable_behavior",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_list",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "02ae4546cd0bd2691cfd4d108be15920047cf0d4478b0e3db7b5b0665d7ab376",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-list/archive/v2.0.14.tar.gz",
          "https://github.com/PolymerElements/iron-list/archive/v2.0.14.tar.gz",
      ],
      strip_prefix = "iron-list-2.0.14",
      path = "/iron-list",
      srcs = ["iron-list.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_keys_behavior",
          "@org_polymer_iron_resizable_behavior",
          "@org_polymer_iron_scroll_target_behavior",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_menu_behavior",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "482c3cad0ad1857fdfeb55d1e22378246379f77e7ac0eb747c248afd87f77146",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-menu-behavior/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/iron-menu-behavior/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "iron-menu-behavior-2.1.0",
      path = "/iron-menu-behavior",
      srcs = [
          "iron-menu-behavior.html",
          "iron-menubar-behavior.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_keys_behavior",
          "@org_polymer_iron_selector",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_meta",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "65366ae55474fd058e052aac01f379a5ca3fd8219e0f51cb9e379e2766d607d7",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-meta/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/iron-meta/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "iron-meta-2.1.0",
      path = "/iron-meta",
      srcs = ["iron-meta.html"],
      deps = ["@org_polymer"],
  )

  web_library_external(
      name = "org_polymer_iron_overlay_behavior",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "1f678414a71ab0fe6ed4b8df1f47ed820191073063d3abe8a61d05dff266078f",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-overlay-behavior/archive/v2.3.3.tar.gz",
          "https://github.com/PolymerElements/iron-overlay-behavior/archive/v2.3.3.tar.gz",
      ],
      strip_prefix = "iron-overlay-behavior-2.3.3",
      path = "/iron-overlay-behavior",
      srcs = [
          "iron-focusables-helper.html",
          "iron-overlay-backdrop.html",
          "iron-overlay-behavior.html",
          "iron-overlay-manager.html",
          "iron-scroll-manager.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_keys_behavior",
          "@org_polymer_iron_fit_behavior",
          "@org_polymer_iron_resizable_behavior",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_pages",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "2db73155902d0f24e3ba19ef680ca620c22ebef204e9dacab470aa25677cbc7d",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-pages/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/iron-pages/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "iron-pages-2.1.0",
      path = "/iron-pages",
      srcs = ["iron-pages.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_resizable_behavior",
          "@org_polymer_iron_selector",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_range_behavior",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "79c2c1b7f03bf41d7b3a798cbd074419945576add48bfb7c2994f45ac3782fd7",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-range-behavior/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/iron-range-behavior/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "iron-range-behavior-2.1.0",
      path = "/iron-range-behavior",
      srcs = ["iron-range-behavior.html"],
      deps = ["@org_polymer"],
  )

  web_library_external(
      name = "org_polymer_iron_resizable_behavior",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "1bd7875d419a63f3c8d4ca3309b53ecf93d8dddb9703913f5442d04903a89976",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-resizable-behavior/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/iron-resizable-behavior/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "iron-resizable-behavior-2.1.0",
      path = "/iron-resizable-behavior",
      srcs = ["iron-resizable-behavior.html"],
      deps = ["@org_polymer"],
  )

  web_library_external(
      name = "org_polymer_iron_scroll_target_behavior",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "9fd59de543198d88e5ca314091954aececf8e5509df6df5bd62232e36886cb58",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-scroll-target-behavior/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/iron-scroll-target-behavior/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "iron-scroll-target-behavior-2.1.0",
      path = "/iron-scroll-target-behavior",
      srcs = ["iron-scroll-target-behavior.html"],
      deps = ["@org_polymer"],
  )

  web_library_external(
      name = "org_polymer_iron_selector",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "dcd7e180f05c9b66c30eedaee030a30e2f87d997f0de132e08ea4a58d494b01b",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-selector/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/iron-selector/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "iron-selector-2.1.0",
      path = "/iron-selector",
      srcs = [
          "iron-multi-selectable.html",
          "iron-selectable.html",
          "iron-selection.html",
          "iron-selector.html",
      ],
      deps = ["@org_polymer"],
  )

  web_library_external(
      name = "org_polymer_iron_validatable_behavior",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "91ad35efdbc9438a41242a4f9aad31284d8749a45968f3a960f4c844c31b3917",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/iron-validatable-behavior/archive/v1.1.2.tar.gz",
          "https://github.com/PolymerElements/iron-validatable-behavior/archive/v1.1.2.tar.gz",
      ],
      strip_prefix = "iron-validatable-behavior-1.1.2",
      path = "/iron-validatable-behavior",
      srcs = ["iron-validatable-behavior.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_meta",
      ],
  )

  web_library_external(
      name = "org_polymer_iron_validator_behavior",
      srcs = ["iron-validator-behavior.html"],
      licenses = ["notice"],  # BSD-3-Clause
      path = "/iron-validator-behavior",
      sha256 = "0956488f849c0528d66d5ce28bbfb66e163a7990df2cc5f157a5bf34dcb7dfd2",
      strip_prefix = "iron-validator-behavior-1.0.2",
      urls = [
          "http://mirror.bazel.build/github.com/PolymerElements/iron-validator-behavior/archive/v1.0.2.tar.gz",
          "https://github.com/PolymerElements/iron-validator-behavior/archive/v1.0.2.tar.gz",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_meta",
      ],
   )

  web_library_external(
      name = "org_polymer_marked",
      licenses = ["notice"],  # MIT
      sha256 = "dd5a84bdf5a52558a09c2fe948e9be9c4f535901845240f3a60f97f092674aa0",
      urls = [
          "https://mirror.bazel.build/github.com/chjj/marked/archive/v0.3.2.tar.gz",
          "https://github.com/chjj/marked/archive/v0.3.2.tar.gz",
      ],
      strip_prefix = "marked-0.3.2",
      path = "/marked",
      srcs = ["lib/marked.js"],
  )

  web_library_external(
      name = "org_polymer_marked_element",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "27abd2ef1cc122d4db32d5308c724e9a4cf9cdb1c224a4409d92cd1f5677e0c1",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/marked-element/archive/v2.4.0.tar.gz",
          "https://github.com/PolymerElements/marked-element/archive/v2.4.0.tar.gz",
      ],
      strip_prefix = "marked-element-2.4.0",
      path = "/marked-element",
      srcs = [
          "marked-element.html",
          "marked-import.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_marked",
      ],
  )

  web_library_external(
      name = "org_polymer_neon_animation",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "64dfd4f0603a6670ae2558eb8cae39920c089961bedf8811ddab426fc1e21372",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/neon-animation/archive/v2.2.1.tar.gz",
          "https://github.com/PolymerElements/neon-animation/archive/v2.2.1.tar.gz",
      ],
      strip_prefix = "neon-animation-2.2.1",
      path = "/neon-animation",
      srcs = [
          "animations/cascaded-animation.html",
          "animations/fade-in-animation.html",
          "animations/fade-out-animation.html",
          "animations/hero-animation.html",
          "animations/opaque-animation.html",
          "animations/reverse-ripple-animation.html",
          "animations/ripple-animation.html",
          "animations/scale-down-animation.html",
          "animations/scale-up-animation.html",
          "animations/slide-down-animation.html",
          "animations/slide-from-bottom-animation.html",
          "animations/slide-from-left-animation.html",
          "animations/slide-from-right-animation.html",
          "animations/slide-from-top-animation.html",
          "animations/slide-left-animation.html",
          "animations/slide-right-animation.html",
          "animations/slide-up-animation.html",
          "animations/transform-animation.html",
          "neon-animatable.html",
          "neon-animatable-behavior.html",
          "neon-animated-pages.html",
          "neon-animation.html",
          "neon-animation-behavior.html",
          "neon-animation-runner-behavior.html",
          "neon-animations.html",
          "neon-shared-element-animatable-behavior.html",
          "neon-shared-element-animation-behavior.html",
          "web-animations.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_meta",
          "@org_polymer_iron_resizable_behavior",
          "@org_polymer_iron_selector",
          "@org_polymer_web_animations_js",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_behaviors",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "74090426df1f50d1071095591cf35deb5d645b9116299b2d8e9d538490bd7f32",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-behaviors/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-behaviors/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-behaviors-2.1.0",
      path = "/paper-behaviors",
      srcs = [
          "paper-button-behavior.html",
          "paper-checked-element-behavior.html",
          "paper-inky-focus-behavior.html",
          "paper-ripple-behavior.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_behaviors",
          "@org_polymer_iron_checked_element_behavior",
          "@org_polymer_paper_ripple",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_card",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "bcfecab0d28dcc5f7b8dd784d71b3c5a90c645fc984f7f57974211b82eccc31b",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-card/archive/v1.1.6.tar.gz",
          "https://github.com/PolymerElements/paper-card/archive/v1.1.6.tar.gz",
      ],
      strip_prefix = "paper-card-1.1.6",
      path = "/paper-card",
      srcs = ["paper-card.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_iron_image",
          "@org_polymer_paper_styles",
          "@org_polymer_paper_material",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_button",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "c3a21e81822f824ab50fe3f36d9fa3f182fefc9884d95ebebd2c3c7878f6dd00",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-button/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-button/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-button-2.1.0",
      path = "/paper-button",
      srcs = ["paper-button.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_paper_behaviors",
          "@org_polymer_paper_material",
          "@org_polymer_paper_ripple",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_checkbox",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "029ccba430b0c9a5ee48f337a5a32b7cdff444bd129b4c4715b27d7bcd48f9e5",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-checkbox/archive/v2.0.3.tar.gz",
          "https://github.com/PolymerElements/paper-checkbox/archive/v2.0.3.tar.gz",
      ],
      strip_prefix = "paper-checkbox-2.0.3",
      path = "/paper-checkbox",
      srcs = ["paper-checkbox.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_paper_behaviors",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_dialog",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "ddc83d55f98161e8109fa6bfdbc908902c221ff92134b4215ca4765c386b0c97",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-dialog/archive/v2.1.1.tar.gz",
          "https://github.com/PolymerElements/paper-dialog/archive/v2.1.1.tar.gz",
      ],
      strip_prefix = "paper-dialog-2.1.1",
      path = "/paper-dialog",
      srcs = ["paper-dialog.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_neon_animation",
          "@org_polymer_paper_dialog_behavior",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_dialog_behavior",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "ab218c9b45218042dc30e0a1c053b995683c32b92692165f0514f5b027adff9f",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-dialog-behavior/archive/v1.2.9.tar.gz",
          "https://github.com/PolymerElements/paper-dialog-behavior/archive/v1.2.9.tar.gz",
      ],
      strip_prefix = "paper-dialog-behavior-1.2.9",
      path = "/paper-dialog-behavior",
      srcs = [
          "paper-dialog-behavior.html",
          "paper-dialog-common.css",
          "paper-dialog-shared-styles.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_iron_overlay_behavior",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_dialog_scrollable",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "e25a40f3bbc7416485e804bdbfcd683d86c2d900cf60951985ef225c482d5fce",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-dialog-scrollable/archive/v2.2.0.tar.gz",
          "https://github.com/PolymerElements/paper-dialog-scrollable/archive/v2.2.0.tar.gz",
      ],
      strip_prefix = "paper-dialog-scrollable-2.2.0",
      path = "/paper-dialog-scrollable",
      srcs = ["paper-dialog-scrollable.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_paper_dialog_behavior",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_dropdown_menu",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "95519f37380476ef6d95119bce6aa6a6271c90a3b83c74f8874e62d601c4d43b",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-dropdown-menu/archive/v1.5.1.tar.gz",
          "https://github.com/PolymerElements/paper-dropdown-menu/archive/v1.5.1.tar.gz",
      ],
      strip_prefix = "paper-dropdown-menu-1.5.1",
      path = "/paper-dropdown-menu",
      srcs = [
          "paper-dropdown-menu.html",
          "paper-dropdown-menu-icons.html",
          "paper-dropdown-menu-light.html",
          "paper-dropdown-menu-shared-styles.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_keys_behavior",
          "@org_polymer_iron_behaviors",
          "@org_polymer_iron_form_element_behavior",
          "@org_polymer_iron_icon",
          "@org_polymer_iron_iconset_svg",
          "@org_polymer_iron_validatable_behavior",
          "@org_polymer_paper_behaviors",
          "@org_polymer_paper_input",
          "@org_polymer_paper_menu_button",
          "@org_polymer_paper_ripple",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_header_panel",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "78c76966c5bd92227f02614c3daae7a467118ac40db7ac3ad1a4234a92e30f86",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-header-panel/archive/v1.1.7.tar.gz",
          "https://github.com/PolymerElements/paper-header-panel/archive/v1.1.7.tar.gz",
      ],
      strip_prefix = "paper-header-panel-1.1.7",
      path = "/paper-header-panel",
      srcs = ["paper-header-panel.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_flex_layout",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_icon_button",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "3026c61abdfaf9621070c879b9a6dbbdd0236d4453467b54f5672e1c22af4c27",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-icon-button/archive/v2.2.0.tar.gz",
          "https://github.com/PolymerElements/paper-icon-button/archive/v2.2.0.tar.gz",
      ],
      strip_prefix = "paper-icon-button-2.2.0",
      path = "/paper-icon-button",
      srcs = [
          "paper-icon-button.html",
          "paper-icon-button-light.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_icon",
          "@org_polymer_paper_behaviors",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_input",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "56129da805dd811ad07cafa11ba34071e7ba191093b731d606816763d64c5f55",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-input/archive/v1.2.1.tar.gz",
          "https://github.com/PolymerElements/paper-input/archive/v1.2.1.tar.gz",
      ],
      strip_prefix = "paper-input-1.2.1",
      path = "/paper-input",
      srcs = [
          "paper-input.html",
          "paper-input-addon-behavior.html",
          "paper-input-behavior.html",
          "paper-input-char-counter.html",
          "paper-input-container.html",
          "paper-input-error.html",
          "paper-textarea.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_keys_behavior",
          "@org_polymer_iron_autogrow_textarea",
          "@org_polymer_iron_behaviors",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_iron_form_element_behavior",
          "@org_polymer_iron_input",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_item",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "710dc8ae3d3aad12513de4d111aab3b0bcb31159d9fb73c9ef6d02642df4bce2",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-item/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-item/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-item-2.1.0",
      path = "/paper-item",
      srcs = [
          "paper-icon-item.html",
          "paper-item.html",
          "paper-item-behavior.html",
          "paper-item-body.html",
          "paper-item-shared-styles.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_behaviors",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_listbox",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "294819be85502bef21fe3aa240597f8a60f38d81075acb15ede06ed0867c7832",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-listbox/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-listbox/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-listbox-2.1.0",
      path = "/paper-listbox",
      srcs = ["paper-listbox.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_menu_behavior",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_material",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "065935ba7946d3f94c61fb536db79658bc87b20d6c44b9914512f496527845fc",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-material/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-material/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-material-2.1.0",
      path = "/paper-material",
      srcs = [
          "paper-material.html",
          "paper-material-shared-styles.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_menu",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "a3cee220926e315f7412236b3628288774694447c0da4428345f36d0f127ba3b",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-menu/archive/v1.2.2.tar.gz",
          "https://github.com/PolymerElements/paper-menu/archive/v1.2.2.tar.gz",
      ],
      strip_prefix = "paper-menu-1.2.2",
      path = "/paper-menu",
      srcs = [
          "paper-menu.html",
          "paper-menu-shared-styles.html",
          "paper-submenu.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_behaviors",
          "@org_polymer_iron_collapse",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_iron_menu_behavior",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_menu_button",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "9de3bc8caa1dbad8578013b3455e71894490095bd30cc24f5fc27cfc449942c1",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-menu-button/archive/v1.5.2.tar.gz",
          "https://github.com/PolymerElements/paper-menu-button/archive/v1.5.2.tar.gz",
      ],
      strip_prefix = "paper-menu-button-1.5.2",
      path = "/paper-menu-button",
      srcs = [
          "paper-menu-button.html",
          "paper-menu-button-animations.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_keys_behavior",
          "@org_polymer_iron_behaviors",
          "@org_polymer_iron_dropdown",
          "@org_polymer_neon_animation",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_progress",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "01557e6385f8ab8fa3fc21fb8eab467ecc3f30a58dc650a6a17032befe427b0c",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-progress/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-progress/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-progress-2.1.0",
      path = "/paper-progress",
      srcs = ["paper-progress.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_iron_range_behavior",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_radio_button",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "7dece68725e512273e754821dd30019006bdb31064dcd3287d373de4c06d8c1e",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-radio-button/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-radio-button/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-radio-button-2.1.0",
      path = "/paper-radio-button",
      srcs = ["paper-radio-button.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_paper_behaviors",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_radio_group",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "d7f83c4ae7b529760c766bfff3a67a198e67e96201029fd68b574a70cbb49360",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-radio-group/archive/v2.2.0.tar.gz",
          "https://github.com/PolymerElements/paper-radio-group/archive/v2.2.0.tar.gz",
      ],
      strip_prefix = "paper-radio-group-2.2.0",
      path = "/paper-radio-group",
      srcs = ["paper-radio-group.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_keys_behavior",
          "@org_polymer_iron_menu_behavior",
          "@org_polymer_iron_selector",
          "@org_polymer_paper_radio_button",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_ripple",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "e7a032f1c194e6222b3b4c80e04f28a201c5d12c7e94a33b77f10ab371a19d84",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-ripple/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-ripple/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-ripple-2.1.0",
      path = "/paper-ripple",
      srcs = ["paper-ripple.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_keys_behavior",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_slider",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "5d922f348e3058d9b52bbccd8847a6d6c9e39c4282317ecd6acaa90d59c0212f",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-slider/archive/v2.0.6.tar.gz",
          "https://github.com/PolymerElements/paper-slider/archive/v2.0.6.tar.gz",
      ],
      strip_prefix = "paper-slider-2.0.6",
      path = "/paper-slider",
      srcs = ["paper-slider.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_keys_behavior",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_iron_form_element_behavior",
          "@org_polymer_iron_range_behavior",
          "@org_polymer_paper_behaviors",
          "@org_polymer_paper_input",
          "@org_polymer_paper_progress",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_spinner",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "df74ce25bdf16df7f82d4567b0a353073de811f6d3d38df95477b7cefa773688",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-spinner/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-spinner/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-spinner-2.1.0",
      path = "/paper-spinner",
      srcs = [
          "paper-spinner-behavior.html",
          "paper-spinner-lite.html",
          "paper-spinner-styles.html",
          "paper-spinner.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_styles",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "37359c72f96f1f3dd90fe7a9ba50d079dc32241de359d5c19c013b564b48bd3f",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-styles/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-styles/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-styles-2.1.0",
      path = "/paper-styles",
      srcs = [
          "classes/global.html",
          "classes/shadow.html",
          "classes/typography.html",
          "color.html",
          "default-theme.html",
          "demo-pages.html",
          "element-styles/paper-item-styles.html",
          "element-styles/paper-material-styles.html",
          "paper-styles-classes.html",
          "paper-styles.html",
          "shadow.html",
          "typography.html",
      ],
      deps = [
          "@org_polymer",
          "@com_google_fonts_roboto",
          "@org_polymer_iron_flex_layout",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_tabs",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "c09fcd78d1e1c79451c6c12c203ec32c6b36f063f25ad6cdf18da81e33bd9a2d",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-tabs/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-tabs/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-tabs-2.1.0",
      path = "/paper-tabs",
      srcs = [
          "paper-tab.html",
          "paper-tabs.html",
          "paper-tabs-icons.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_behaviors",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_iron_icon",
          "@org_polymer_iron_iconset_svg",
          "@org_polymer_iron_menu_behavior",
          "@org_polymer_iron_resizable_behavior",
          "@org_polymer_paper_behaviors",
          "@org_polymer_paper_icon_button",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_toast",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "d47c0be0387d0f13fa756413f192c4719e1b36c0aa0e2373176733d6224e7001",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-toast/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-toast/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-toast-2.1.0",
      path = "/paper-toast",
      srcs = ["paper-toast.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_a11y_announcer",
          "@org_polymer_iron_overlay_behavior",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_toggle_button",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "adf4b41d7e2cfd0d267f62c94506c409be39212e0deadcec7b25526b4d9acd2c",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-toggle-button/archive/v1.3.0.tar.gz",
          "https://github.com/PolymerElements/paper-toggle-button/archive/v1.3.0.tar.gz",
      ],
      strip_prefix = "paper-toggle-button-1.3.0",
      path = "/paper-toggle-button",
      srcs = ["paper-toggle-button.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_paper_behaviors",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_toolbar",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "6ce97a7cd55b7aadbe0fbd2c1ef768759e5f8f516645c61a2871018828dccffe",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-toolbar/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/paper-toolbar/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "paper-toolbar-2.1.0",
      path = "/paper-toolbar",
      srcs = ["paper-toolbar.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_iron_flex_layout",
          "@org_polymer_paper_styles",
      ],
  )

  web_library_external(
      name = "org_polymer_paper_tooltip",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "07eacd783507d4aad3e5e6e0c128c3816aa7e3149bf8f7dfce525ea5568d0565",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/paper-tooltip/archive/v2.1.1.tar.gz",
          "https://github.com/PolymerElements/paper-tooltip/archive/v2.1.1.tar.gz",
      ],
      strip_prefix = "paper-tooltip-2.1.1",
      path = "/paper-tooltip",
      srcs = ["paper-tooltip.html"],
      deps = [
          "@org_polymer",
          "@org_polymer_neon_animation",
      ],
  )

  web_library_external(
      name = "org_polymer_prism",
      licenses = ["notice"],  # MIT
      sha256 = "9dc3e68c9f34794a6edb3fc54eb39f4905f1ac6b8e12ecc27836cff1abbccf36",
      urls = [
          "https://mirror.bazel.build/github.com/PrismJS/prism/archive/v1.13.0.tar.gz",
          "https://github.com/PrismJS/prism/archive/v1.13.0.tar.gz",
      ],
      strip_prefix = "prism-1.13.0",
      path = "/prism",
      srcs = [
          "prism.js",
          "themes/prism.css",
      ],
  )

  web_library_external(
      name = "org_polymer_prism_element",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "b7c222f2f9254eae469ef6fa0baa208b376d37b33f7511a4a2471db35bdc40c7",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerElements/prism-element/archive/v2.1.0.tar.gz",
          "https://github.com/PolymerElements/prism-element/archive/v2.1.0.tar.gz",
      ],
      strip_prefix = "prism-element-2.1.0",
      path = "/prism-element",
      srcs = [
          "prism-highlighter.html",
          "prism-import.html",
          "prism-theme-default.html",
      ],
      deps = [
          "@org_polymer",
          "@org_polymer_prism",
      ],
  )

  web_library_external(
      name = "org_polymer_promise_polyfill",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "d83edb667c393efb3e7b40a2c22d439e1d84056be5d36174be6507a45f709daa",
      strip_prefix = "promise-polyfill-1.0.1",
      urls = [
          "https://mirror.bazel.build/github.com/PolymerLabs/promise-polyfill/archive/v1.0.1.tar.gz",
          "https://github.com/PolymerLabs/promise-polyfill/archive/v1.0.1.tar.gz",
      ],
      path = "/promise-polyfill",
      srcs = [
          "Promise.js",
          "Promise-Statics.js",
          "promise-polyfill.html",
          "promise-polyfill-lite.html"
      ],
      deps = ["@org_polymer"],
  )

  web_library_external(
      name = "org_polymer_web_animations_js",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "f8bd760cbdeba131f6790bd5abe170bcbf7b1755ff58ed16d0b82fa8a7f34a7f",
      urls = [
          "https://mirror.bazel.build/github.com/web-animations/web-animations-js/archive/2.2.1.tar.gz",
          "https://github.com/web-animations/web-animations-js/archive/2.2.1.tar.gz",
      ],
      strip_prefix = "web-animations-js-2.2.1",
      path = "/web-animations-js",
      srcs = ["web-animations-next-lite.min.js"],
  )

  web_library_external(
      name = "org_polymer_webcomponentsjs",
      licenses = ["notice"],  # BSD-3-Clause
      sha256 = "2164e6d07d72d4326865ab7c0acee5493870e1ae5f31e9d22665dff4a4773078",
      urls = [
          "https://mirror.bazel.build/github.com/webcomponents/webcomponentsjs/archive/v0.7.24.tar.gz",
          "https://github.com/webcomponents/webcomponentsjs/archive/v0.7.24.tar.gz",
      ],
      strip_prefix = "webcomponentsjs-0.7.24",
      path = "/webcomponentsjs",
      srcs = [
          "CustomElements.js",
          "CustomElements.min.js",
          "HTMLImports.js",
          "HTMLImports.min.js",
          "MutationObserver.js",
          "MutationObserver.min.js",
          "ShadowDOM.js",
          "ShadowDOM.min.js",
          "webcomponents.js",
          "webcomponents.min.js",
          "webcomponents-lite.js",
          "webcomponents-lite.min.js",
      ],
  )
