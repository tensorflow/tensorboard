# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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
# ==============================================================================
"""Self-diagnosis script for TensorBoard.

Instructions: Save this script to your local machine, then execute it in
the same environment (virtualenv, Conda, etc.) from which you normally
run TensorBoard. Read the output and follow the directions.
"""


# This script may only depend on the Python standard library. It is not
# built with Bazel and should not assume any third-party dependencies.
import dataclasses
import errno
import functools
import hashlib
import inspect
import logging
import os
import pipes
import shlex
import socket
import subprocess
import sys
import tempfile
import textwrap
import traceback


# A *check* is a function (of no arguments) that performs a diagnostic,
# writes log messages, and optionally yields suggestions. Each check
# runs in isolation; exceptions will be caught and reported.
CHECKS = []


@dataclasses.dataclass(frozen=True)
class Suggestion:
    """A suggestion to the end user.

    Attributes:
      headline: A short description, like "Turn it off and on again". Should be
        imperative with no trailing punctuation. May contain inline Markdown.
      description: A full enumeration of the steps that the user should take to
        accept the suggestion. Within this string, prose should be formatted
        with `reflow`. May contain Markdown.
    """

    headline: str
    description: str


def check(fn):
    """Decorator to register a function as a check.

    Checks are run in the order in which they are registered.

    Args:
      fn: A function that takes no arguments and either returns `None` or
        returns a generator of `Suggestion`s. (The ability to return
        `None` is to work around the awkwardness of defining empty
        generator functions in Python.)

    Returns:
      A wrapped version of `fn` that returns a generator of `Suggestion`s.
    """

    @functools.wraps(fn)
    def wrapper():
        result = fn()
        return iter(()) if result is None else result

    CHECKS.append(wrapper)
    return wrapper


def reflow(paragraph):
    return textwrap.fill(textwrap.dedent(paragraph).strip())


def pip(args):
    """Invoke command-line Pip with the specified args.

    Returns:
      A bytestring containing the output of Pip.
    """
    # Suppress the Python 2.7 deprecation warning.
    PYTHONWARNINGS_KEY = "PYTHONWARNINGS"
    old_pythonwarnings = os.environ.get(PYTHONWARNINGS_KEY)
    new_pythonwarnings = "%s%s" % (
        "ignore:DEPRECATION",
        ",%s" % old_pythonwarnings if old_pythonwarnings else "",
    )
    command = [sys.executable, "-m", "pip", "--disable-pip-version-check"]
    command.extend(args)
    try:
        os.environ[PYTHONWARNINGS_KEY] = new_pythonwarnings
        return subprocess.check_output(command)
    finally:
        if old_pythonwarnings is None:
            del os.environ[PYTHONWARNINGS_KEY]
        else:
            os.environ[PYTHONWARNINGS_KEY] = old_pythonwarnings


def which(name):
    """Return the path to a binary, or `None` if it's not on the path.

    Returns:
      A bytestring.
    """
    binary = "where" if os.name == "nt" else "which"
    try:
        return subprocess.check_output([binary, name])
    except subprocess.CalledProcessError:
        return None


def sgetattr(attr, default):
    """Get an attribute off the `socket` module, or use a default."""
    sentinel = object()
    result = getattr(socket, attr, sentinel)
    if result is sentinel:
        print("socket.%s does not exist" % attr)
        return default
    else:
        print("socket.%s = %r" % (attr, result))
        return result


@check
def autoidentify():
    """Print the Git hash of this version of `diagnose_tensorboard.py`.

    Given this hash, use `git cat-file blob HASH` to recover the
    relevant version of the script.
    """
    module = sys.modules[__name__]
    try:
        source = inspect.getsource(module).encode("utf-8")
    except TypeError:
        logging.info("diagnose_tensorboard.py source unavailable")
    else:
        # Git inserts a length-prefix before hashing; cf. `git-hash-object`.
        blob = b"blob %d\0%s" % (len(source), source)
        hash = hashlib.sha1(blob).hexdigest()
        logging.info("diagnose_tensorboard.py version %s", hash)


@check
def general():
    logging.info("sys.version_info: %s", sys.version_info)
    logging.info("os.name: %s", os.name)
    na = type("N/A", (object,), {"__repr__": lambda self: "N/A"})
    logging.info(
        "os.uname(): %r",
        getattr(os, "uname", na)(),
    )
    logging.info(
        "sys.getwindowsversion(): %r",
        getattr(sys, "getwindowsversion", na)(),
    )


@check
def package_management():
    conda_meta = os.path.join(sys.prefix, "conda-meta")
    logging.info("has conda-meta: %s", os.path.exists(conda_meta))
    logging.info("$VIRTUAL_ENV: %r", os.environ.get("VIRTUAL_ENV"))


@check
def installed_packages():
    freeze = pip(["freeze", "--all"]).decode("utf-8").splitlines()
    packages = {line.split("==")[0]: line for line in freeze}
    packages_set = frozenset(packages)

    # For each of the following families, expect exactly one package to be
    # installed.
    expect_unique = [
        frozenset(
            [
                "tensorboard",
                "tb-nightly",
                "tensorflow-tensorboard",
            ]
        ),
        frozenset(
            [
                "tensorflow",
                "tensorflow-gpu",
                "tf-nightly",
                "tf-nightly-2.0-preview",
                "tf-nightly-gpu",
                "tf-nightly-gpu-2.0-preview",
            ]
        ),
        frozenset(
            [
                "tensorflow-estimator",
                "tensorflow-estimator-2.0-preview",
                "tf-estimator-nightly",
            ]
        ),
    ]
    salient_extras = frozenset(["tensorboard-data-server"])

    found_conflict = False
    for family in expect_unique:
        actual = family & packages_set
        for package in actual:
            logging.info("installed: %s", packages[package])
        if len(actual) == 0:
            logging.warning("no installation among: %s", sorted(family))
        elif len(actual) > 1:
            logging.warning("conflicting installations: %s", sorted(actual))
            found_conflict = True
    for package in sorted(salient_extras & packages_set):
        logging.info("installed: %s", packages[package])

    if found_conflict:
        preamble = reflow(
            """
            Conflicting package installations found. Depending on the order
            of installations and uninstallations, behavior may be undefined.
            Please uninstall ALL versions of TensorFlow and TensorBoard,
            then reinstall ONLY the desired version of TensorFlow, which
            will transitively pull in the proper version of TensorBoard. (If
            you use TensorBoard without TensorFlow, just reinstall the
            appropriate version of TensorBoard directly.)
            """
        )
        packages_to_uninstall = sorted(
            frozenset().union(*expect_unique) & packages_set
        )
        commands = [
            "pip uninstall %s" % " ".join(packages_to_uninstall),
            "pip install tensorflow  # or `tensorflow-gpu`, or `tf-nightly`, ...",
        ]
        message = "%s\n\nNamely:\n\n%s" % (
            preamble,
            "\n".join("\t%s" % c for c in commands),
        )
        yield Suggestion("Fix conflicting installations", message)

    wit_version = packages.get("tensorboard-plugin-wit")
    if wit_version == "tensorboard-plugin-wit==1.6.0.post2":
        # This is only incompatible with TensorBoard prior to 2.2.0, but
        # we just issue a blanket warning so that we don't have to pull
        # in a `pkg_resources` dep to parse the version.
        preamble = reflow(
            """
            Versions of the What-If Tool (`tensorboard-plugin-wit`)
            prior to 1.6.0.post3 are incompatible with some versions of
            TensorBoard. Please upgrade this package to the latest
            version to resolve any startup errors:
            """
        )
        command = "pip install -U tensorboard-plugin-wit"
        message = "%s\n\n\t%s" % (preamble, command)
        yield Suggestion("Upgrade `tensorboard-plugin-wit`", message)


@check
def tensorboard_python_version():
    from tensorboard import version

    logging.info("tensorboard.version.VERSION: %r", version.VERSION)


@check
def tensorflow_python_version():
    import tensorflow as tf

    logging.info("tensorflow.__version__: %r", tf.__version__)
    logging.info("tensorflow.__git_version__: %r", tf.__git_version__)


@check
def tensorboard_data_server_version():
    try:
        import tensorboard_data_server
    except ImportError:
        logging.info("no data server installed")
        return

    path = tensorboard_data_server.server_binary()
    logging.info("data server binary: %r", path)
    if path is None:
        return

    try:
        subprocess_output = subprocess.run(
            [path, "--version"],
            capture_output=True,
            check=True,
        )
    except subprocess.CalledProcessError as e:
        logging.info("failed to check binary version: %s", e)
    else:
        logging.info(
            "data server binary version: %s", subprocess_output.stdout.strip()
        )


@check
def tensorboard_binary_path():
    logging.info("which tensorboard: %r", which("tensorboard"))


@check
def addrinfos():
    sgetattr("has_ipv6", None)
    family = sgetattr("AF_UNSPEC", 0)
    socktype = sgetattr("SOCK_STREAM", 0)
    protocol = 0
    flags_loopback = sgetattr("AI_ADDRCONFIG", 0)
    flags_wildcard = sgetattr("AI_PASSIVE", 0)

    hints_loopback = (family, socktype, protocol, flags_loopback)
    infos_loopback = socket.getaddrinfo(None, 0, *hints_loopback)
    print("Loopback flags: %r" % (flags_loopback,))
    print("Loopback infos: %r" % (infos_loopback,))

    hints_wildcard = (family, socktype, protocol, flags_wildcard)
    infos_wildcard = socket.getaddrinfo(None, 0, *hints_wildcard)
    print("Wildcard flags: %r" % (flags_wildcard,))
    print("Wildcard infos: %r" % (infos_wildcard,))


@check
def readable_fqdn():
    # May raise `UnicodeDecodeError` for non-ASCII hostnames:
    # https://github.com/tensorflow/tensorboard/issues/682
    try:
        logging.info("socket.getfqdn(): %r", socket.getfqdn())
    except UnicodeDecodeError as e:
        try:
            binary_hostname = subprocess.check_output(["hostname"]).strip()
        except subprocess.CalledProcessError:
            binary_hostname = b"<unavailable>"
        is_non_ascii = not all(
            0x20
            <= (ord(c) if not isinstance(c, int) else c)
            <= 0x7E  # Python 2
            for c in binary_hostname
        )
        if is_non_ascii:
            message = reflow(
                """
                Your computer's hostname, %r, contains bytes outside of the
                printable ASCII range. Some versions of Python have trouble
                working with such names (https://bugs.python.org/issue26227).
                Consider changing to a hostname that only contains printable
                ASCII bytes.
                """
                % (binary_hostname,)
            )
            yield Suggestion("Use an ASCII hostname", message)
        else:
            message = reflow(
                """
                Python can't read your computer's hostname, %r. This can occur
                if the hostname contains non-ASCII bytes
                (https://bugs.python.org/issue26227). Consider changing your
                hostname, rebooting your machine, and rerunning this diagnosis
                script to see if the problem is resolved.
                """
                % (binary_hostname,)
            )
            yield Suggestion("Use a simpler hostname", message)
        raise e


@check
def stat_tensorboardinfo():
    # We don't use `manager._get_info_dir`, because (a) that requires
    # TensorBoard, and (b) that creates the directory if it doesn't exist.
    path = os.path.join(tempfile.gettempdir(), ".tensorboard-info")
    logging.info("directory: %s", path)
    try:
        stat_result = os.stat(path)
    except OSError as e:
        if e.errno == errno.ENOENT:
            # No problem; this is just fine.
            logging.info(".tensorboard-info directory does not exist")
            return
        else:
            raise
    logging.info("os.stat(...): %r", stat_result)
    logging.info("mode: 0o%o", stat_result.st_mode)
    if stat_result.st_mode & 0o777 != 0o777:
        preamble = reflow(
            """
            The ".tensorboard-info" directory was created by an old version
            of TensorBoard, and its permissions are not set correctly; see
            issue #2010. Change that directory to be world-accessible (may
            require superuser privilege):
            """
        )
        # This error should only appear on Unices, so it's okay to use
        # Unix-specific utilities and shell syntax.
        quote = getattr(shlex, "quote", None) or pipes.quote  # Python <3.3
        command = "chmod 777 %s" % quote(path)
        message = "%s\n\n\t%s" % (preamble, command)
        yield Suggestion('Fix permissions on "%s"' % path, message)


@check
def source_trees_without_genfiles():
    roots = list(sys.path)
    if "" not in roots:
        # Catch problems that would occur in a Python interactive shell
        # (where `""` is prepended to `sys.path`) but not when
        # `diagnose_tensorboard.py` is run as a standalone script.
        roots.insert(0, "")

    def has_tensorboard(root):
        return os.path.isfile(os.path.join(root, "tensorboard", "__init__.py"))

    def has_genfiles(root):
        sample_genfile = os.path.join("compat", "proto", "summary_pb2.py")
        return os.path.isfile(os.path.join(root, "tensorboard", sample_genfile))

    def is_bad(root):
        return has_tensorboard(root) and not has_genfiles(root)

    tensorboard_roots = [root for root in roots if has_tensorboard(root)]
    bad_roots = [root for root in roots if is_bad(root)]

    logging.info(
        "tensorboard_roots (%d): %r; bad_roots (%d): %r",
        len(tensorboard_roots),
        tensorboard_roots,
        len(bad_roots),
        bad_roots,
    )

    if bad_roots:
        if bad_roots == [""]:
            message = reflow(
                """
                Your current directory contains a `tensorboard` Python package
                that does not include generated files. This can happen if your
                current directory includes the TensorBoard source tree (e.g.,
                you are in the TensorBoard Git repository). Consider changing
                to a different directory.
                """
            )
        else:
            preamble = reflow(
                """
                Your Python path contains a `tensorboard` package that does
                not include generated files. This can happen if your current
                directory includes the TensorBoard source tree (e.g., you are
                in the TensorBoard Git repository). The following directories
                from your Python path may be problematic:
                """
            )
            roots = []
            realpaths_seen = set()
            for root in bad_roots:
                label = repr(root) if root else "current directory"
                realpath = os.path.realpath(root)
                if realpath in realpaths_seen:
                    # virtualenvs on Ubuntu install to both `lib` and `local/lib`;
                    # explicitly call out such duplicates to avoid confusion.
                    label += " (duplicate underlying directory)"
                realpaths_seen.add(realpath)
                roots.append(label)
            message = "%s\n\n%s" % (
                preamble,
                "\n".join("  - %s" % s for s in roots),
            )
        yield Suggestion(
            "Avoid `tensorboard` packages without genfiles", message
        )


# Prefer to include this check last, as its output is long.
@check
def full_pip_freeze():
    logging.info(
        "pip freeze --all:\n%s", pip(["freeze", "--all"]).decode("utf-8")
    )


def set_up_logging():
    # Manually install handlers to prevent TensorFlow from stomping the
    # default configuration if it's imported:
    # https://github.com/tensorflow/tensorflow/issues/28147
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
    logger.addHandler(handler)


def main():
    set_up_logging()

    print("### Diagnostics")
    print()

    print("<details>")
    print("<summary>Diagnostics output</summary>")
    print()

    markdown_code_fence = "``````"  # seems likely to be sufficient
    print(markdown_code_fence)
    suggestions = []
    for (i, check) in enumerate(CHECKS):
        if i > 0:
            print()
        print("--- check: %s" % check.__name__)
        try:
            suggestions.extend(check())
        except Exception:
            traceback.print_exc(file=sys.stdout)
            pass
    print(markdown_code_fence)
    print()
    print("</details>")

    for suggestion in suggestions:
        print()
        print("### Suggestion: %s" % suggestion.headline)
        print()
        print(suggestion.description)

    print()
    print("### Next steps")
    print()
    if suggestions:
        print(
            reflow(
                """
                Please try each suggestion enumerated above to determine whether
                it solves your problem. If none of these suggestions works,
                please copy ALL of the above output, including the lines
                containing only backticks, into your GitHub issue or comment. Be
                sure to redact any sensitive information.
                """
            )
        )
    else:
        print(
            reflow(
                """
                No action items identified. Please copy ALL of the above output,
                including the lines containing only backticks, into your GitHub
                issue or comment. Be sure to redact any sensitive information.
                """
            )
        )


if __name__ == "__main__":
    main()
