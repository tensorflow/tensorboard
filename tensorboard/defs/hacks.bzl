# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Compatibility hacks."""

# TODO(@jart): Merge this file into defs.bzl once that file is sync unified.

def tensorboard_typescript_bundle(
        name,
        out,
        namespace_srcs,
        namespace_symbol_aliases = {},
        namespace_symbol_aliases_public = {}):
    """Rolls TypeScript ES6 modules into one vanilla source file without imports.

    This is a genrule wrapper that concatenates TypeScripts sources inside
    namespace blocks while removing ^import lines. Because the sources themselves
    are not parsed, the structure of the modules must be passed to this macro as
    a Skylark data structure.

    Args:
      name: Name of this build rule target.
      out: Path of outputted TypeScript source file.
      namespace_srcs: Multimap of namespace strings to build file targets. The
          ordering of the dictionary and nested lists does not matter when
          generating a typings file, but *does* matter when generating a source
          file.
      namespace_symbol_aliases: Map of namespace strings where each value is a
          map of symbol names to fully qualified symbol names.
      namespace_symbol_aliases_public: Same as namespace_symbol_aliases but the
          symbol will be visible to other namespaces.
    """
    cmd = ["(", "echo // GENERATED BY TENSORBOARD_TYPESCRIPT_BUNDLE"]
    inputs_depsets = []
    for namespace, srcs in namespace_srcs.items():
        cmd.append("echo")
        if out[-5:] == ".d.ts":
            cmd.append("echo 'declare namespace %s {'" % namespace)
        elif out[-3:] == ".ts":
            cmd.append("echo 'module %s {'" % namespace)
        else:
            fail("'out' must end with .ts or .d.ts: " + out)
        for symbol, canon in namespace_symbol_aliases.get(namespace, {}).items():
            cmd.append("echo 'import %s = %s;'" % (symbol, canon))
        for symbol, canon in namespace_symbol_aliases_public.get(
            namespace,
            {},
        ).items():
            cmd.append("echo 'export import %s = %s;'" % (symbol, canon))
        inputs_depsets.append(depset(srcs))
        for src in srcs:
            cmd.append("for f in $(locations %s); do" % src)
            cmd.append("  echo")
            cmd.append("  echo /////////////////////////////////////////////////////")
            cmd.append("  echo // " + namespace)
            cmd.append("  echo // $$f")
            cmd.append("  echo /////////////////////////////////////////////////////")
            cmd.append("  echo")
            cmd.append("  sed 's!^import !// import !' $$f \\")
            cmd.append("    | sed 's!^export declare !export !' \\")
            cmd.append("    | sed '/^export .* from /d' \\")
            cmd.append("    | sed '/^export {.*};$$/d'")
            cmd.append("done")
        cmd.append("echo '}'")
    cmd.append(") >$@")
    native.genrule(
        name = name,
        srcs = depset(transitive = inputs_depsets).to_list(),
        outs = [out],
        cmd = "\n".join(cmd),
    )
