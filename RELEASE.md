# Release 1.7.0

The 1.7 minor series tracks TensorFlow 1.7.

## Hightlights

- (Beta) New Beholder plugin that shows a live video feed of tensor data during
  model training, by @chrisranderson. Caveat: only currently recommended for use
  where TensorBoard and TensorFlow share a local disk. See for details:
  https://github.com/tensorflow/tensorboard/tree/1.7/tensorboard/plugins/beholder

## Features

- Debugger tensor value card improvements:
  - Entering new slice/time indices will automatically refresh view (#1017)
  - Clicking title will highlight node in other parts of the UI (#1023)
- Debugger health pills now show number of NaN/Inf values if any (#1026)

## Changes

- Audio summary playback elements no longer loop by default (PR #1061), but
  looping can be enabled for individual elements through a right-click option.

## Bug fixes

- #965 - pr_curve_streaming_op no longer results in duplicate plots (PR #1053)
- #967 - custom scalar margin plots with missing tags now indicate the run
- #970 - browser back button now works across home page (/) - thanks @brianwa84
- #990 - apple-touch-icon.png requests no longer trigger 404s - thanks @lanpa
- #1010 - content no longer intrudes into sidebar on narrow viewports
- #1016 - CTRL+C now exits TensorBoard even with debugger enabled (PR #975)
- #1021 - text plugin no longer always shows as inactive on first page load


# Release 1.6.0

NOTICE: TensorBoard 1.6.0+ has moved to the `tensorboard` package name on PyPI:
https://pypi.python.org/pypi/tensorboard. Only bugfix updates on 1.5.x will be
applied to the old package name (`tensorflow-tensorboard`). To upgrade to
TensorBoard 1.6.0+ we suggest you *first* `pip uninstall tensorflow-tensorboard`
before doing `pip install tensorboard`. See "Known Issues" below if you run into
problems using TensorBoard after upgrading.

The 1.6 minor series tracks TensorFlow 1.6.

## Highlights

- (Beta) New Profile dashboard, which provides a suite of tools for inspecting
  TPU performance.  See for details:
  https://github.com/tensorflow/tensorboard/tree/1.6/tensorboard/plugins/profile
- (Alpha) New Debugger dashboard, which provides a visual interface to `tfdbg`,
  the TensorFlow debugger. See for details:
  https://github.com/tensorflow/tensorboard/tree/1.6/tensorboard/plugins/debugger

## Known issues

- Package `tensorboard` is installed but command and/or module are missing or
  have the wrong version - this may be due to conflicts with other packages that
  provide `tensorboard` scripts or modules. Please uninstall *all* such packages
  including `tensorboard`, `tensorflow-tensorboard` and `tb-nightly` and then
  reinstall `tensorboard`.
- Bazel 0.9.0+ required to build from source - this change was necessary in order
  to add support for building at Bazel 0.10.0 and above. Please update Bazel.


# Release 1.5.1

NOTICE: TensorBoard 1.6.0+ will move to the `tensorboard` package name on PyPI,
instead of using `tensorflow-tensorboard`. Only bugfix updates on 1.5.x will be
applied to the old package name. To upgrade to TensorBoard 1.6.0+ please *first*
`pip uninstall tensorflow-tensorboard` before doing `pip install tensorboard`.

The 1.5 minor series tracks TensorFlow 1.5.

## Bug fixes

- #554 - line charts no longer "shrink" after run changes on other tabs
- #889 - fixed xComponentsCreationMethod default in vz-line-chart
- #898 - fixed offset of checkbox label in projector dashboard - thanks @marcj
- #903 - disabled margin plot smoothing to avoid line going out of bounds
- #916 - made `futures` dependency py2-only to avoid install failures
- #924 - fixed graph dashboard bug causing blank PNG download and minimap
- #926 - made projector plugin API available in pip package

## Documentation updates

- Custom scalars documentation now documents margin plots feature (#878)
- FAQ updated to describe custom scalars plugin use cases


# Release 1.5.0

The 1.5 minor series tracks TensorFlow 1.5.

## Highlights

- New Custom Scalars dashboard, which can display configurable custom line and
  margin charts based on the same data as the regular Scalars dashboard. See
  for details: https://github.com/tensorflow/tensorboard/tree/1.5/tensorboard/plugins/custom_scalar
- Many projector plugin enhancements thanks to @francoisluus, which enable
  cognitive-assisted labeling via semi-supervised t-SNE
  - t-SNE specific features: semi-supervision (#811) plus perturb (#705) and
    pause/resume (#691) buttons
  - general features: metadata editor (#753), selection edit mode (#697), edit
    box for neighbors slider (#733), 2D sprite element zooming (#696)

## Features

- Image dashboard brightness and constrast sliders (#771) - thanks @edmundtong
- Top-level dashboard tabs now scroll when there are too many to fit (#730)
- Settable browser window title with --window_title flag (#804) - thanks @tkunic
- Tag filters are now reflected in the URL, making them saveable (#787)
- Pane-based dashboards now only load charts from first two panes by default,
  which should improve responsiveness (#643 defaults tag filter search string
  to empty, and #871 makes first two panes open by default)
- Lower latency to serve TensorBoard HTML thanks to preloading in memory (#708)
- Lazy imports ("import tensorboard as tb") now work for summary APIs (#778)
- PR curve summaries now have pb (#633) and raw_data_pb (#646) versions

## Bug fixes

- #265 - fixed `--logdir` to handle Windows drive letters - thanks @shakedel
- #784 - fixed bug in find similar subgraph algo - thanks @trisolaran
- Graph plugin fixed to
  - correctly render function nodes (#817)
  - pan to nodes more reliably (#824, #837)
  - rebuild hierarchy if callbacks change to avoid race in rendering (#879)


# Release 0.4.0

The 0.4 minor series tracks TensorFlow 1.4.

## Features

- PR Curve plugin has a full-featured new dashboard (#387, #426, many others)
- PR Curve plugin has new streaming and raw summary-writing ops (#520, #587)
- Graph plugin has a new "Functions" scene group to show function libraries and
  links to function calls (#394, #395, #497, #551, others)
- Graph plugin metanodes are now colored more helpfully (#467)
- Graph plugin selected run is now persisted to URL (#505)
- Standard dashboard card header UI is more compact and readable (#430)
- Pagination limit can now be configured in settings (#535)
- Text plugin now has op and pb summary writing methods (#510)
- Reduced boilerplate and cleaner API hooks for custom plugins (#611, #620)
- Faster initial loads due to improved active plugin detection (#621, #663)
- Reuse of TCP connections with switch to using HTTP/1.1 (#617)

## Bug fixes

- #477 - fixed URLs to properly URI-encode run and tag names
- #610 - fixed smoothing algorithm initial value bias - thanks @alexirpan
- #647 - fixed text plugin decoding error that led to bad markdown processing
