# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Defines `py_repl` rule for creating a `bazel run`-able python REPL."""

# Minimal wrapper over ctx.actions.write to write a string to a file.
# Simpler than the genrule equivalent since we don't need to escape.
def _write_file_impl(ctx):
    ctx.actions.write(ctx.outputs.out, ctx.attr.content)

_write_file = rule(
    implementation = _write_file_impl,
    attrs = {
        "out": attr.output(mandatory = True),
        "content": attr.string(),
    },
)

def py_repl(name, preamble = None, deps = None):
    """Executable target that runs the python interpeter interactively.

    This provides a convenient way to interactively explore Python library
    code that must be run under Bazel (e.g. it depends on Bazel-generated
    Python dependencies, so cannot be run using `python -i` alone). It is
    effectively just a wrapper over defining a `py_binary` with your desired
    library deps plus a main.py with a few "preamble" lines and then running
    the resulting built binary using `PYTHONINSPECT=1` to drop you in a REPL.

    Args:
      name: the name of this target
      preamble: list of strings definining lines of Python code
        that should be executed when starting the interpreter
      deps: py_library targets that should be available as dependencies
        to import into the interpreter
    """

    # Print each line of the preamble before executing it.
    full_preamble = "\n".join(
        ["print(" + repr(line) + ")\n" + line for line in preamble],
    )

    _write_file(
        name = name + "_py_gen",
        out = name + ".py",
        content = full_preamble,
    )

    native.py_binary(
        name = name + "_py",
        srcs = [name + ".py"],
        main = name + ".py",
        deps = deps,
    )

    _write_file(
        name = name + "_sh_gen",
        out = name + ".sh",
        content = "PYTHONINSPECT=1 exec $1",
    )

    # Use `args` to pass the location of the data dep which is shorter
    # and sweeter than the sh runfiles self-bootstrapping rigamarole.
    # Thanks, underappreciated https://stackoverflow.com/a/64841428.
    native.sh_binary(
        name = name,
        srcs = [name + ".sh"],
        args = ["$(location :" + name + "_py)"],
        data = [":" + name + "_py"],
    )
