# TensorBoard in Colab

@wchargin, 2019-02-22

**Status:** Shipped!

## Background

We want to be able to use TensorBoard directly in Colab. This is a common user
need, but people usually satisfy it with hacks involving reverse tunnels that
we’d rather not encourage. A first-class solution can be both safer and
significantly easier to use. This will also enable us to embed TensorBoard in
our docs and tutorials.

For simplicity, we’re fine with rendering TensorBoard’s whole UI (top bar chrome
and all) in a single Colab cell. How can we achieve that?

Following is a draft proposal for how to approach this. There are two pieces:
the Python/Colab API that end users will see, and the implementation of the
frontend serving logic. Each piece has an approach marked “recommended”, and
other options that were considered along the way (kept for historical context).

## Security considerations

Colab notebooks run under google.com domains, so security is an important
consideration. We will use the existing Colab iframe sandboxing infrastructure,
which enables us to safely run arbitrary HTML and JS inside an iframe while
still making HTTP requests against a web server running inside the Colab VM,
mediated by a Colab-managed service worker tunnel.

Within Python cells in Colab, we will invoke the `tensorboard` binary as a
subprocess. This binary comes from the `tensorboard` PyPI distribution, which we
control, and currently only runs code that we have authored or reviewed. In the
future, we may modify TensorBoard to automatically run TensorBoard plugins that
the user has installed. (**Editor’s note:** TensorBoard now does load dynamic
plugins.)

## Goals and non-goals

Goals:

-   The TensorFlow and TensorBoard tutorials featured on the website, which are
    written as Colab notebooks, should be able to embed TensorBoard where
    appropriate.
-   Users and researchers writing their own Colab notebooks should be able to
    open a TensorBoard instance to visualize their data without resorting to
    `ngrok` hacks.

Non-goals/nice-to-haves:

-   It is not necessary that the workflows developed for Colab work verbatim in
    other analogous environments, like Jupyter notebooks or Kaggle kernels. In
    particular, we may assume that we are running specifically on Ubuntu.
-   It is not necessary that all advanced features of TensorBoard be accessible
    through the high-level API. For example, the API might not expose options to
    change the reload interval, configure the reservoir sampling constants, or
    open a debugger port.

## Technical background on subprocesses in Colab

There are three ways to run a subprocess in Colab: using the `%%script` cell
magic, using `%%script --bg`, or using the Python `subprocess` module. (Using
the bang-syntax `!foo` is equivalent to using the `%%script` cell magic without
the `--bg` option, and `%%bash [--bg]` is equivalent to `%%script bash [--bg]`.)

When using `%%script --bg`, the provided script runs in the background, and its
output is not displayed or streamed in the cell itself. You can pass `%%script
--bg --out myout` to bind a Python variable `myout` to a pipe to which the
subprocess’s output will be redirected (and likewise with `--err myerr`), but we
probably don’t want to require end users to do this.

When using `%%script` (without the `--bg` option), the provided script’s stdout
and stderr are captured and printed in the shell. Colab reads stdout and stderr
until EOF, and EOF cannot be reached until all open file descriptors on these
streams have been closed. So, if you launch any background subprocesses that
have access to stdout or stderr, the cell will block until they have exited (or
closed the fds). That is, this cell will block for three seconds:

```
%%script bash
sleep 3 &
```

…but this cell will complete immediately, while the sleep runs in the
background:

```
%%script bash
sleep 3 >/dev/null 2>&1 &
```

When using the Python subprocess module, subprocesses’ output streams appear to
be always disconnected from the host stdout and stderr. So, for instance, this
cell completes after two seconds, and the word _never_ never appears in this
Colab cell or any other:

```python
import subprocess, time
p = subprocess.Popen(["sh", "-c", "sleep 1; echo never; sleep 3"])
print("one")
time.sleep(2)
print("two")
print(p.poll())
```

The cell will print (immediately) “one”, then (after two seconds) “two”, then
(immediately) “None”.

For comparison, running `time.sleep(1); print("surprise")` in a new Python
thread in the same process would cause surprise to be printed along with the
regular output of whatever Colab cell happens to be executed next, which is
super confusing and which we should not do.

Across these three approaches, there does not appear to be any native way for a
background process to continue streaming output to a cell after completing
execution and releasing the Colab cell lock.

If any subprocesses are running when the Colab runtime is restarted, they are
reparented to init and continue to run. If any subprocesses are running when the
Colab runtime is factory-reset, the subprocesses are killed (this assigns you to
a fresh VM, complete with an empty filesystem and a new hostname).

## Options for user-facing APIs

This section is relevant from a product standpoint, because it impacts how end
users will interact with Colab to spin up a TensorBoard instance.

### (recommended) `%tensorboard` magic with database in `/tmp/`

This option describes a proposal where the entire user-facing API for the 99%
use case is a line magic that looks just like a command-line invocation. For
instance,

```
%tensorboard --logdir ./logs/
```

will show a TensorBoard instance at the given logdir. Arbitrary arguments are
supported.

#### UI mocks

The main flow looks like this:

![Screenshot of the `%tensorboard` magic in a cell whose output shows a
TensorBoard frame][screenshot]

[screenshot]: ./images/colab_screenshot.png

Here are some additional interactions (failure cases, etc.). Boldface text
denotes cell contents. Roman text denotes output. Italic text denotes comments.

> **%tensorboard** \
> Starting TensorBoard… \
> *[above line is removed after the instance fails to start]* \
> Traceback (…): \
> […] \
> ValueError: A logdir or db must be specified. […]

> **%tensorboard --logdir ./logs** \
> Starting TensorBoard… \
> *[above line is removed after the instance successfully starts]* \
> *[TensorBoard output frame appears here after the instance starts]*

> **%tensorboard --logdir ./logs** \
> Reusing TensorBoard on port 6006 (pid 659), started 0:01:28 ago. (Use “!kill
> 659” to kill it.) \
> *[TensorBoard output frame appears here]*

> **%tensorboard --logdir ./exponents** \
> Starting TensorBoard… \
> *[above line is removed after the instance fails to start]* \
> ERROR: TensorBoard could not bind to port 6006, it was already in use \
> *[following lines are added by the Colab wrapper]* \
> NOTE: There is 1 TensorBoard instance already running: \
> &nbsp;&nbsp;\- (pid 659) port 6006, started 0:01:28 ago, on logdir ./logs \
> Use “!kill SOME_PID” to kill the running TensorBoard instance with pid
> SOME_PID.

> **%tensorboard --logdir ./exponents --port 6007** \
> [as in the first success case]

> **import tensorboard as tb; tb.colab.display()** \
> Showing TensorBoard with logdir ./exponents (started 0:00:45 ago; port 6007,
> pid 663). \
> *[TensorBoard output frame appears here]*

> **tb.colab.display(port=6006)** \
> Showing TensorBoard with logdir ./logs (started 0:02:21 ago; port 6006, pid
> 659).

> **tb.colab.display(port=7777)** \
> Showing TensorBoard on port 7777… \
> *[In TensorBoard output frame: “Couldn’t find a TensorBoard instance on port
> 7777.”]*

#### High-level changes and APIs

First, augment TensorBoard such that it writes metadata such as its logdir,
port, start time, and command-line arguments to
`/tmp/.tensorboard-info/${PID}.info` when its server launches. Other processes
will read these files to learn metadata about the running TensorBoards.\*† We
refer to the data structure stored in these files as `TensorboardInfo`; see
section “`TensorboardInfo` format” below for details.

Then, provide the following APIs:

-   The line magic `%tensorboard [ARGS…]` launches a TensorBoard with the
    command-line arguments that the user provides‡ (reusing an existing instance
    if applicable), and displays it in a Colab cell. If TensorBoard fails to
    start, this line magic prints a list of known running TensorBoards, to help
    surface port conflicts.

-   The `tb.notebook` module provides a slightly broader API:

    -   `tb.notebook.start(args_string)` does exactly the same thing as
        `%tensorboard`.
    -   `tb.notebook.display(port?, size=None)` opens an output frame for an
        existing TensorBoard running in the VM at the given port.§ If port is
        not given, it is determined from the most recently launched TensorBoard
        (see below). If size is specified (as an `(int, int)` tuple), it sets
        the output frame dimensions; otherwise, there’s a reasonable default.
    -   `tb.notebook.list()` prints a list of running TensorBoard instances.

-   When not in a Colab environment, the `tb.notebook` module falls back to a
    shim that fails with helpful errors (like, “you’re not inside an IPython
    notebook” or “try running this shell command instead”). We can add more
    backends later (e.g., Kaggle Kernels?).

-   The `tb.manager` module, to be considered non-public for now, backs the
    preceding APIs:

    -   `tb.manager.start(args)` is just like `tb.notebook.start(args)`, except
        that it does not publish HTML to a Colab cell (and does not know about
        Colab at all). It returns a value indicating whether the instance
        started, was reused, or failed to start, providing the new process’s
        `TensorboardInfo` if appropriate.
    -   `tb.manager.get_all()`: Return `TensorboardInfo`s for all known
        TensorBoards. (This backs `tb.notebook.list()`.) This does not perform
        liveness checks: stale info entries may be returned.
    -   `tb.manager.ensure_live(pid, timeout_seconds=10)`: Ensures that a
        TensorBoard on the specified process can actually be reached, by hitting
        an endpoint (say, `/data/logdir`) on the server. If the request fails,
        the info file will be deleted. Returns a boolean indicating whether the
        server was live.
    -   Some internal utilities like `tb.manager.write_info_file` and
        `tb.manager.cache_key`, to be called by `main`. See section
        “`TensorboardInfo` format” below.

If for any reason we have trouble writing the line magic, we can keep just the
`tb.notebook.start` endpoint and use that instead. It’s a bit less desirable
because (a) it requires a Python import of `tensorboard` and (b) it feels less
like a shell command, but it wouldn’t be the end of the world.

\* This could alternately be achieved by teaching TensorBoard to respond to
SIGUSR1 by writing this information to a file. However, using signal handlers
(a) doesn’t work on Windows, (b) requires some care with respect to thread
safety, and (c) can be blocked indefinitely due to the GIL.

† This is a broadly useful thing to have, anyway. Currently, any process that
wants to launch TensorBoard and then learn the port number needs to
[manually parse stderr][smoke-stderr], and doing so with a long-running process
means that you have to start caring about EPIPE…having the information available
in a more structured form would be a great simplification.

‡ As interpreted by [`shlex.split`][shlex-split] in POSIX-mode: see section
“Interpretation of command-line arguments”.

§ An arbitrary base URL is not permitted. For the service worker tunnel to work,
the origin must be `https://localhost:*`. To show a TensorBoard on a publicly
visible host, just embed a normal iframe. Within Colab, just don’t set a
nontrivial `--path_prefix`.

[shlex-split]: https://docs.python.org/3.5/library/shlex.html#shlex.split
[smoke-stderr]: https://github.com/tensorflow/tensorboard/blob/8776e54dd5679e627f2459c332b1c9e70c84f7d8/tensorboard/pip_package/build_pip_package.sh#L55

#### Analysis

**Advantage:** Users use TensorBoard pretty much exactly as they would from a
local terminal.

**Advantage:** Users who always invoke the same TensorBoard command (say, by
pressing “run all” multiple times within a tutorial notebook) don’t have to care
about ports, nor will they see a large delay due to any TensorBoard restarts,
because the same backend will be reused.

**Advantage:** If two cells have `%tensorboard` line magics with different
arguments, they can both be executed arbitrarily many times in arbitrary order,
and will only use two backends.

**Advantage:** It is likely possible for the same infrastructure and user-facing
APIs to work nearly verbatim in IPython notebooks on Linux, macOS, and even
Windows.

**Advantage:** If we wanted to make this kind of “reusable backend”
functionality available as an end-user CLI tool (say, a tensorboard-manager(1)
binary or a subcommand of tensorboard), the new infrastructure in the
`tb.manager` module would be useful.

**Disadvantage:** Implementation work is non-trivial, though not unreasonable.

#### Implementation notes

##### Cell vs. line magic

We use a line magic (`%tensorboard`) instead of a cell magic (`%%tensorboard`)
because IPython doesn’t let you invoke a cell magic with no contents after the
first line.

##### Multiple TensorBoards per process

The `tensorboard.program` Python API permits users to launch potentially
multiple TensorBoard servers within an existing Python process (via
multithreading). This API was added in [PR&nbsp;#1240][pr-1240], with the
original intent of being used for Colab integration (!). However, now that we’re
actually writing the Colab integration, we think that subprocesses are a better
foundation than threads (don’t have to worry about GIL blocking Colab vs.
TensorBoard; don’t have to worry about output interleaving; don’t have to worry
about any potential shared-memory bugs), and the Colab team has agreed with this
assessment.

Thus, the ability to launch multiple TensorBoard servers within an existing
Python process is no longer (was never) useful to us. Moreover, it does
complicate this effort: if we want to support multiple TensorBoards per process,
then our info files need to have a concept of a monotonically increasing index.
We’d like to deprecate this API moving forward.

Across all of GitHub, there appear to be\* four users of this API currently, of
which three could be trivially migrated to spawn TensorBoard in a subprocess
instead of a new thread:

-   [dennerepin/stochnets:tensorboard_run.py][pgm-dennerepin]: Python main entry
    point (never imported) that just sets an environment variable and launches
    TensorBoard.
-   [vishal-keshav/fast_prototype:evaluator.py][pgm-vishal-keshav]: Spawns
    TensorBoard and prints the URL, but doesn’t store the URL or reference the
    thread or anything.
-   [wshand/Python-Data-Science-Workshop:….ipynb][pgm-wshand]: Launches
    TensorBoard in a thread as the very last cell of an IPython notebook, as
    “convenience code”, while also telling users that they can just launch
    TensorBoard from the command line.

This leaves one user whose use case looks “genuine”:

-   [criteo/tf-yarn:tensorboard.py][pgm-criteo]: Appears to integrate with some
    internal-to-them infrastructure for port selection and event handling, so
    might not have trivial migration. However, it does appear that this user
    [only supports launching a single TensorBoard per process][criteo-caveat].

Given that we’ve explicitly put this forward as a public API (e.g., in our
release notes), we don’t necessarily want to just nix it entirely without
migrating `criteo/tf-yarn`’s use case. But we are comfortable deprecating it and
not integrating it with Colab. The immediate effect of this will be that
TensorBoard instances launched with `TensorBoard.launch` will not be discovered
by the Colab/`manager` APIs.

\* Per GitHub search for “tensorboard program launch get_assets_zip_provider”
and then manually filtering out 15 pages of false-positives that are duplicate
check-ins of TensorBoard’s own source code.

[criteo-caveat]: https://github.com/criteo/tf-yarn/blob/8f16ea107575081915a50324f4d99380a331da57/tf_yarn/tensorboard.py#L43
[pgm-criteo]: https://github.com/criteo/tf-yarn/blob/8f16ea107575081915a50324f4d99380a331da57/tf_yarn/tensorboard.py
[pgm-dennerepin]: https://github.com/dennerepin/stochnets/blob/cf4df84e00a412c6c754cdf1b40e96d6356bb300/stochnet/applicative/tensorboard_run.py
[pgm-vishal-keshav]: https://github.com/vishal-keshav/fast_prototype/blob/4cdf0e7ef94f3bd39453b9f068f1234e6a02c74d/core/evaluator.py
[pgm-wshand]: https://github.com/kernelmethod/Python-Data-Science-Workshop/blob/5dd909a15efd782d509aad96000349243cdb7281/3.%20Building%20Neural%20Networks%20with%20Keras.ipynb
[pr-1240]: http://github.com/tensorflow/tensorboard/pull/1240

##### `TensorboardInfo` format

A `/tmp/.tensorboard-info/${PID}.info` file should contain the canonically
stringified version of a JSON object with the following keys:

-   `version`: String. `TensorboardInfo` format version identifier.
-   `start_time`: Integer (i64). Seconds since epoch UTC at which the
    TensorBoard instance started serving.
-   `port`: Integer (u16). The port on `localhost` on which this TensorBoard
    instance is listening.
-   `pid`: Integer (u32). The pid of the Python process hosting the TensorBoard
    server.
-   `path_prefix`: String. The effective value of the `--path_prefix` argument
    to TensorBoard.
-   `logdir`: String. Value of `--logdir` flag (may be empty).\*
-   `db`: String. Value of `--db` flag (may be empty).
-   `cache_key`: String such that if two TensorBoards have the same `cache_key`
    then it is safe to use either in place of the other. Includes initial
    working directory and command-line arguments.†

(This JSON format is compatible with the proto3 JSON mapping, so we can promote
this to a proto if we want later.)

Because we provide a `version` field, we should be able to iterate on this
format as needed. The Python APIs will ignore any invalid info files or info
files set to incompatible versions.

The `tensorboard.program.TensorBoard.main` entry point will be modified such
that (a) it writes a TensorboardInfo object to the appropriate info file once
the server starts up; (b) it registers an `atexit` handler to remove this file
upon shutdown; and (c) it handles SIGTERM‡ to exit cleanly (so that the `atexit`
handler is invoked).

\* It would be nice to replace the logdir and db fields with a single field
`environment` that holds a cached version of the `/data/environment` endpoint
(e.g., `{"mode": "logdir", "data_location": "./logs/"}`). This is slightly more
difficult to implement (plumbing), so we’ll consider doing it later.

† Really this should be something like “checksum of tensorboard binary, contents
of environment, and command-line arguments”, but the listed form is simpler to
implement and probably just fine in practice.

‡ This actually works on both Unix and Windows: see docs for
[`signal.signal`][signal-docs].

[signal-docs]: https://docs.python.org/2/library/signal.html#signal.signal

##### Interpretation of command-line arguments

When the line magic is invoked as `%tensorboard --logdir="my logs" --port 6006`,
it is provided the contents of the line as a Python string: `"--logdir=\"my
logs\" --port 6006"`. To be properly passed to the `tensorboard`(1) binary,
these must undergo some kind of shell-like word splitting.

We’ll use [`shlex.split(…, posix=True)`][shlex-split] for this. This means that
quoted strings with spaces are fine, but tilde expansion, parameter expansion,
command substitution, and friends will not be performed, and special forms like
“2>&1” will be interpreted literally (as if single-quoted).

TensorBoard itself calls `expanduser` on file-like arguments, so “`--logdir
~/data/`” will still work even though the TensorBoard process will literally
receive “`~/data/`” as an argument.

Assuming that we want to support logdirs with spaces, an alternative would be to
actually use the underlying shell to parse the arguments. It’s not clear that
there’s a good way to do this without allowing arbitrary code execution as in
“`%tensorboard --logdir foo & touch bad.txt`”. As an attack vector, this isn’t
too bad for the line magic itself: anyone who can inject malicious code into the
input cell can already execute arbitrary Python code. But the line magic is
backed by a Python API, and it’s less clear that we want to provide a Python API
that opens a subprocess with `shell=True`.

It seems reasonable to simply say “things like ‘`%tensorboard --logdir
./logs_$((x + 1))`’ are not supported use cases”. This certainly suffices for
the 99% use case. Users who really want to do something like this can use
`%%bash --bg` and `tensorboard.notebook.display()` manually.

##### Disowning processes

As proposed, we won’t `wait`(2) for our subprocesses. If the Colab runtime
restarts, subprocesses will be reparented to `init` and reaped appropriately.
Within a single runtime, given that we deduplicate TensorBoards by logdir, we
can accept a few extra entries in the process table, given that Colab runtimes
restart at least daily. We could also reparent them to `init` explicitly, though
getting this right while still getting the underlying TensorBoard’s PID and also
redirecting its stdout and stderr to known files might require the Popen shell
code to be very slightly more than trivial. (And, it should be noted, I have no
idea how any of this translates to Windows.)

### Alternative: Run TensorBoard with `%%bash --bg`

Usage:

```
%%bash --bg
tensorboard --logdir ./logs/ --port 6006
```

```python
# in a Python cell…
tb.colab.show(port=6006)
```

```
# later…
!pkill -f tensorboard  # or whatever
```

API for module tensorboard.colab:

```python
"""Show the TensorBoard instance running on the given port.

Raises ValueError if no TensorBoard is running on this port.
"""
def show(port): raise NotImplementedError()
```

**Advantage:** No state to maintain, just a simple wrapper.

**Advantage:** If we want, we can make `show(…)` open TensorBoard in the default
browser when not in Colab (and maybe move it to `tensorboard.show` from
`tensorboard.colab.show`), so that it would really be functionally equivalent in
Colab vs. local. Not clear whether this is something that people would actually
want to use.

**Disadvantage:** When user runs the `%%bash --bg` cell, if the command fails
(e.g., TensorBoard fails to bind to the port because there is already one
running), there is no indication to the user that a failure has occurred because
the process is backgrounded. If we don’t use `--bg`, then Colab waits for the
whole process tree to terminate before releasing the cell lock, so we can’t do
something like “`nohup tensorboard & verify launched successfully`”. We can
capture the backgrounded output as a stream in Python-land, like

```
%%bash --bg --err tb_stderr
tensorboard --logdir ./logs/ --port 6006
```

```python
# in a Python cell (something like this, modulo stream blocking…)
launched = ("could not bind to port" not in tb_stderr.read(1024))
```

so we could hypothetically pass the output streams to `tb.colab.show`, but now
this is getting more complicated and starting to look out of place for a
tutorial. It may be fine to accept this downside. As an alternative, we could
include `pkill -f tensorboard` in the `%%bash` cell that we include in
tutorials. We can also make sure that `show(…)` shows a nice error message if no
TensorBoard is running.

**Disadvantage:** No automated management or cleanup (e.g., user has to pick
port). This is not the end of the world, but is awkward and will feel like a
wart.

### Alternative: Manage resources with RAII-style Python objects

Usage:

```python
my_tensorboard = tb.colab.ColabTensorboard(logdir="/tmp/foo")
my_tensorboard.display()
# later...
my_tensorboard.stop()  # or
tb.colab.stop_all()
```

Module `tensorboard.colab`:

```python
class ColabTensorboard(object):
  """Start a TensorBoard subprocess (port=None autopicks)."""
  def __init__(self, logdir, port=None): raise NotImplementedError()

  """Open this TensorBoard in a Colab output cell."""
  def display(self): raise NotImplementedError()

  """Stop this TensorBoard server if it’s still running."""
  def stop(self): raise NotImplementedError()

  """Automatically clean up when there are no more references."""
  def __del__(self): self.stop()

_tensorboards = weakref.WeakSet()  # global, WeakSet[ColabTensorboard]

"""Stop all currently running tensorboards."""
def stop_all():
  for t in _tensorboards: t.stop()
```

**Advantage:** Port finding and management is hidden from the user; things “just
work”.

**Advantage:** We can verify in `ColabTensorboard.__init__` that TensorBoard
launches successfully by inspecting the subprocess output.

**Disadvantage:** Users don’t learn how to launch TensorBoard on their own,
without using Colab.

**Disadvantage:** There doesn’t appear to be a good way to manage the resources:

-   If we invoke `stop` when the object goes out of scope (as in the example
    above), then you can’t write `tb.colab.ColabTensorboard(…).display()` by
    itself, because the ref will immediately be unreachable and thus the server
    stopped.
-   If we don’t invoke `stop`, then lots of resources will be leaked: ports most
    obviously, but also totally redundant CPU and memory when there are multiple
    TensorBoards running against the same logdir even though only one of them is
    actually serving a frontend.
-   Regardless of whether we invoke stop, restarting the runtime (`C-m .`) will
    clear the Python state but leave any backgrounded subprocesses running.
    There’s no obvious way to keep track of these from within this Python API.
    (We could do things like invoking with `sh -c "tensorboard --logdir foo
    && : # tensorboard.colab"` and then filter for processes that contain
    `tensorboard.colab` in their cmdline, but nothing about this seems like a
    good idea.) (Note that while _restarting_ the runtime leaves subprocesses
    running (reparenting them to `init`), _resetting_ the runtime kills them
    all.)

This last disadvantage seems sufficient to nix this option.

### Alternative: Use the process table as a source of truth

API for module `tb.colab`:

-   `tb.colab.start(logdir)`: Launch a TensorBoard for the given logdir, and
    display it in an output frame. If a TensorBoard at this logdir exists, reuse
    it instead of launching a new one. This is the only entry point needed for
    the 99% use case.
-   `tb.colab.display_port(port)`: For advanced users. Display an existing
    TensorBoard running on the given port.
-   `tb.colab.list()`: For advanced users. Print a list of running TensorBoard
    instances, with pid and port for each.

Running `tb.colab.start(…)` should print “Starting TensorBoard…” while the
server is starting, then replace this message with the actual TensorBoard
instance. If it reuses an existing TensorBoard, it should retain the message
“Reusing existing TensorBoard (pid 1234) for logdir ~/foo.”.

Running `tb.colab.list()` should print

> There are 3 TensorBoard instances running: \
> &nbsp;&nbsp;\- pid 1232: started 10 minutes ago on port 5676 with logdir ~/foo
> \
> &nbsp;&nbsp;\- pid 1233: started 8 minutes ago on port 5677 with logdir ~/bar
> \
> &nbsp;&nbsp;\- pid 1234: started just now on port 5678 with logdir ~/baz \
> Use `tb.colab.display_port(port)` to display an existing TensorBoard on a
> given port.

(We could maybe accept `force_start=True` to not deduplicate, but barring
TensorBoard bugs this shouldn’t be necessary for end users. It might be useful
for TensorBoard developers to debug.)

We’d need to make sure to resolve logdirs to full paths soundly. A simple
approach would be to include the initial working directory as part of the cache
key.

#### Extracting running TensorBoard metadata

Given the pid of a running TensorBoard process, we want to extract its
start/elapsed time, its logdir, and its port.

On a Unix system, we can use `ps -o etime= -q "${pid}"` to get the elapsed time
of a process. For the logdir, initial working directory, and port, two
approaches come to mind:

-   Read `/proc/PID/cmdline` to get the argument list to TensorBoard. Thence
    extract the logdir and the value of an `--info_file` argument, to which the
    TensorBoard process has written the initial work directory and server port.
-   Modify TensorBoard to respond to SIGUSR1 by writing its logdir, port, and
    any other useful information to `/tmp/tensorboard-${PID}.info`. This has the
    advantage that it works even with TensorBoards started by the user manually,
    without giving an `--info_file`.

Reading the command line from procfs only works on Linux specifically (there may
be macOS and Windows analogues), while responding to SIGUSR1 will work on any
Unix.

**Disadvantage:** Users don’t learn how to launch TensorBoard on their own,
without using Colab.

**Advantage:** Users don’t have to care about ports, but if they have manually
launched a TensorBoard and they know its port then they can display it, too.

**Advantage:** A single command starts a TensorBoard at a logdir or reuses an
existing one.

**Advantage:** We can make sure that TensorBoard launches successfully and
communicate that to the user even though we’re backgrounding it.

### Related: `tensorboard-manager`

(Obsolete: see the “`%tensorboard` magic” option.)

The “Use the process table as the source of truth” option above is related to
the potential addition of a “TensorBoard manager” for local workstations. Such a
command might offer options like

-   `tensorboard-manager` start to launch and open TensorBoard or reuse an
    existing one;
-   `tensorboard-manager` port to find the port on which a given TensorBoard is
    listening;
-   `tensorboard-manager` list to list all running TensorBoards; ….

Some of the same questions arise. For instance, we need to soundly (and
preferably completely) deduplicate TensorBoards based on logdir and other flags.
This is not conceptually difficult, but has a few moving pieces: relative paths
to logdirs from different initial working directories; comma-separated logdir
specifications; irrelevance of order of command-line arguments; handling
multiple versions of TensorBoard; etc.

If we had such a `tensorboard-manager`, then much of the functionality of
`tb.colab` could be implemented in terms of it. Conversely, to implement
`tb.colab`, we will end up implementing a subset of this functionality.

There is an argument to be made that we should just write this
`tensorboard-manager` upfront and pay close attention to these details. But
that’s not the only approach. For instance, we can soundly (but not completely)
deduplicate TensorBoards by logdir by simply including the initial working
directory as part of the cache key and refusing to handle any TensorBoards with
arguments other than `--logdir`. This would suffice for the 99% use case of
Colab and unblock us to TF2.0. We need only ensure that we retain a forward
upgrade path to reimplement the `tb.colab` APIs in terms of a future
`tensorboard-manager`, and this should not be too difficult.

## Options for frontend strategy

This section isn’t really relevant from a product standpoint; it’s purely
implementation details. Feel free to skip if uninterested.

On the frontend, there are two issues to resolve, which are somewhat orthogonal
but not entirely so:

-   The frontend shell must learn the origin on which the TensorBoard server is
    listening (we’ll take `https://localhost:6006` as a running example), which
    is not the same origin as the Colab output frame itself (like
    `https://${ID}-colab.googleusercontent.com`).
-   The shell must communicate this origin to TensorBoard itself so that it can
    route requests correctly.

Here are some proposed approaches.

### (recommended) Change the document base URI and rehydrate the served HTML after modification

Render something like the following HTML:

```python
shell = """
  <script>
    document.querySelector("base").href = "https://localhost:%s";
    function fixUpTensorboard() {
      const tftb = document.querySelector("tf-tensorboard");
      tftb.removeAttribute("use-hash");
    }
    function rehydrate() {
      for (const script of document.querySelectorAll("script")) {
        const newScript = document.createElement(
          <script type={script.type}>{script.textContent}</script>
        );
        document.body.appendChild(newScript);
        newScript.remove();
      }
    }
    fetch(".")
      .then((x) => x.text())
      .then((html) => void (document.body.innerHTML = html))
      .then(() => fixUpTensorboard())
      .then(() => rehydrate());
  </script>
""" % port
IPython.display.HTML(shell)
```

The Colab team says that changing the base URL in this way will not interfere
with their runtime (e.g., their service worker tunnel), and that this will
continue to be the case.

**Advantage:** No changes to TensorBoard’s routing system required. Even
resources that do not go through the TensorBoard router will automatically point
to the right place.

**Advantage:** No changes to TensorBoard’s bundling system required. We don’t
need a separate bundle that omits the entry point; we change the standard entry
point instead.

**Advantage:** We can embed “environment variable setup” in this script tag.
(For instance, we could set `window.TENSORBOARD_ENV` to `Object.freeze({inColab:
true})` so that components can adjust their behavior as necessary.)

**Advantage:** Does not use native HTML imports; instead, emulates the polyfill
behavior, but splices in a step to make Colab-specific changes to the stock
TensorBoard DOM after it is parsed by the browser but before the JavaScript is
executed. (Clever idea due to @nfelt—thanks!)

### Alternative: Change the document base URI and embed TensorBoard with an HTML import

Render something like the following HTML:

```python
shell = """
  <script>
    document.querySelector("base").href = "https://localhost:%s";
    const link = document.createElement(<link rel="import" href="index.html" />);
    link.onload = () => {
      const tftb = document.createElement(<tf-tensorboard use-hash={false} />);
      document.getElementById("container").appendChild(tftb);
    };
    document.body.appendChild(link);
  </script>
  <div id="container" style="height: 800px"></div>
""" % port
IPython.display.HTML(shell)
```

**Advantage:** No changes to TensorBoard’s routing system required. Even
resources that do not go through the TensorBoard router will automatically point
to the right place.

**Advantage:** No changes to TensorBoard’s bundling system required.

**Disadvantage:** Uses HTML imports, which will be removed from Chrome in M73
(April&nbsp;2019). Might be able to use the HTML imports polyfill (but this
isn’t good in perpetuity). Does not appear to work if you literally inline the
content into the page by calling `document.write` or assigning to
`document.body.innerHTML`, because scripts are not executed. (But see
“…rehydrate the served HTML after modification” option for a good workaround
that actually uses this to our advantage.)

### Alternative: Teach TensorBoard about an “environment variable” on window to configure its TypeScript router

Something like the following:

```python
script_element = "<script>window.TENSORBOARD_ORIGIN = %s;</script>" % (
    json.dumps("https://localhost:%s" % port)
)
index_html = subprocess.check_call(["curl", "localhost:%s" % port]).decode("utf-8")
IPython.display.HTML(script_element + index_html)
```

The resulting HTML structure will not be strictly valid: for instance, `<style>`
and `<title>` elements may appear in the `<body>`. But this is fine: the browser
will interpret them laxly.

**Advantage:** No need for HTML imports.

**Advantage:** This has a path forward for other environment variables that we
might want to set, like “initialize to the following dashboard rather than
scalars”.

**Disadvantage:** This will only affect fetches that go through TensorBoard’s
router. This might be sufficient, but it means that (e.g.) instead of `<img
src="demo.png />` you need to use the TensorBoard router to compute a path to
the image.

### Alternative: Instantiate a tf-tensorboard with appropriate props

Something like the following:

```python
index_html = subprocess.check_call(
  ["curl", "localhost:%s/?no_entry_point=1" % port]
).decode("utf-8")
entry_point = """
  <tf-tensorboard use-hash="false" origin="https://localhost:%s">
  </tf-tensorboard>
""" % port
IPython.display.HTML(index_html + entry_point)
```

or the analogous thing with an HTML import instead of raw inclusion.

**Advantage:** This has a path forward for other environment variables that we
might want to set, like “initialize to the following dashboard rather than
scalars”.

**Disadvantage:** We need the TensorBoard main page to *not* include the usual
entry point, which means that the backend will have to either have two
pre-processed bundles, or strip out the entry point dynamically, which makes it
not much better than…

### Alternative: Munge the TensorBoard page on the backend

Something like the following:

```python
index_html = subprocess.check_call(["curl", "localhost:%s" % port]).decode("utf-8")
index_html = index_html.replace(
  "XXX_TENSORBOARD_ORIGIN_HERE_XXX",
  json.dumps("https://localhost:%s" % port),
)
IPython.display.HTML(index_html)
```

This is like the previous option, but replaces the somewhat ugly
`<script>`-element concatenation with the also-pretty-ugly find-and-replace.

**Disadvantage:** This is obviously brittle and depends on that exact string
appearing exactly once in the bundle. This precludes supporting third-party
plugins.

### Non-option: Load TensorBoard with a query parameter

It would be great if we could just load TensorBoard normally and pass a query
parameter like `colab_origin=https://localhost:6006` that the frontend could use
to configure its router.

However, we don’t actually get to control the URL that gets loaded into the
Colab sandbox; we can only set the page contents. The actual URL is not on
localhost at all; it is on googleusercontent and points to a script that
bootstraps the Colab message-passing system. So we don’t see a way to do this.

## Changelog

-   **2019-02-05:** Update minutiae to match implementation.
-   **2019-02-01:** Add Python API option (`%tensorboard` magic with database in
    `/tmp/`). Revise miscellanea.
-   **2019-01-25:** Add two Python API options (“Use the process tree” and “Note
    about cell magics”) and a recommended frontend option (“Change base URI and
    rehydrate”) based on conversations with @nfelt. Add discussion of how
    backgrounded subprocesses work in Colab cells.
-   **2019-01-23:** Initial version sent out for review.
