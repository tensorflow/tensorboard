# Release 2.8.0

The 2.8 minor series tracks TensorFlow 2.8.

## Features

- Histograms
  - TensorFlow 2 tf.summary.histogram API is now fully compatible with TPUs (#5356, #5392, #5404, #5409, #5415, #5443)
- Text
  - Add checkbox to enable or disable markdown rendering (#5378)
- Time Series
  - Add more horizontal space by restyling resize bar (#5390)
  - Preserve run regex filter string in URL (#5412)
  - Collapse some chart groups by default (#5408)
  - Introduce "Alphabetical" tooltip sort and make it the default (#5442)
  - Allow card width to be customized (#5496)
- Mesh
  - Allow camera properties to be specified in config (#5452)
- Misc
  - Better support for cloud file systems by conditionally importing tensorflow_io (#5491)

## Bug fixes

- Time Series
  - Fix line chart dark mode bug (#5305)
  - Fix scalars/image/histogram button toggle issues (#5398)
  - Fix subtle SVG chart update issue (#5423)
  - Dark mode fix for collapsible groups (#5426)
  - Font fix for collapsible groups (#5429)
  - Optimize paints triggered by mouse movements (#5461)
  - Improve fallback to SVG charts when WebGL context can't be created (#5465)
  - Improve management of WebGL contexts by freeing them more frequently (#5465)
  - Fix subtle settings bugs (#5458)
  - Fix bug with run selector expander disappearing (#5503)
- Documentation and Examples
  - Update scalars_and_keras demo notebook to use `learning_rate` instead of `lr` (#5363)
  - Fix example_basic plugin (#5366)
- Misc
  - Successfully load in Safari and iOS browsers (#5495)
  - Allow tensorboard to be run with Python 3.10 (#5490) - thanks [@simonkrenger](https://github.com/simonkrenger)
  - Update tests for Python 3.11 compatibility (#5380) - thanks [@tirkarthi](https://github.com/tirkarthi)

## TensorBoard.dev updates

- Support delete of multiple experiments at the same time (#5471)

# Release 2.7.0

The 2.7 minor series tracks TensorFlow 2.7.

## Features

- Time Series plugin
  - Run selection now is based on regex filter (#5252)
  - Run match logic matches run name and alias  (#5334, #5351)
  - Prepare Time Series for promotion to the first tab (#5291)
  - Improve/persist tag filter in the URL (#5249, #5236, #5263, #5265, #5271, #5300)
  - Show sample count on image cards (#5250)
  - Keep all digits for step values (#5325)
  - Remove pinned view while filtering (#5324)
  - Show relative time in tooltip (#5319)
  - UI: style improvements, adjust scroll position
- Core
  - Resizable run table sidebar (#5219)
  - Support for fsspec filesystems (#5248)
- Hparams
  - Treat no data as an empty experiment rather than an error (#5273)
  - Add tf.stop_gradient in tf.summary.histogram (#5311) - thanks [@allenlavoie](https://github.com/allenlavoie)

## Bug fixes

- Darkmode improvements and fixes (#5318)
- Time Series
  - Improve visibility logics (#5234, #5235)
  - Reset PluginType filter when selected all (#5272)
- PR curve plugin: display correct thresholds (#5191)
- Line chart
  - Recreate charts upon fatal renderer errors (#5237)
  - Fix zoom interaction (#5215)
  - Skip axis label render based on visibility (#5317)
- Dropdown ui fixes (#5194, #5199, #5242)
- Navigation handling (#5223, #5216)
- Documentation
  - document the Time Series dashboard (#5193)
-  Update README.md to include no-data example (#5163)

# Release 2.6.0

The 2.6 minor series tracks TensorFlow 2.6.

## Features

- Added dark mode
- Some user settings are now kept in local storage and are persisted after page reload, including:
  - Time Series `scalars smoothing`, `tooltip sorting method`, `ignore outliers in chart scaling`
  - Settings dialog `reload data`, `reload period`, `pagination limit`
  - Dark mode
- Time Series
  - Improved positioning of the `fit` button in scalar chart (#4856)
  - Improved selection of runs when new runs arrive (#4888)

## Bug fixes

- Fixed bug where some plugins were not appearing in plugins list (#4849)
- Fixed subtle bugs in navigation (#4974)
- Stopped storing default values for settings on the URL (#5030)
- Graphs
  - Fixed parsing of `_output_shapes` attr (#4867)
- HParams
  - Fixed parallel coordinate layout (#4988)
- Projector
  - Fix KNN algorithm and, by extension, T-SNE and UMAP embeddings (#5063)
  - Make opaque sprites opaque (#4921) - thanks [@tyhenry](https://github.com/tyhenry)
  - Make transparent sprites transparent (#5149) - thanks [@canbakiskan](https://github.com/canbakiskan)
- Scalars
  - Improved rendering of small major axis numbers (#5010)
  - Fixed axis label in Firefox (#5078)
- Time Series
  - Fixed rendering of filter text areas (#4938)
  - Improved rendering of small major axis numbers (#5010)
  - Improved tooltip rendering (#5003)
  - Fixed scrolling of runs selector (#5020)
  - Make runs selector header sticky on scroll (#5024)
  - Improved rendering of step axis to use SI units (#5015)
- Documentation
  - Fixed and cleaned documentation and demos during TensorBoard team fixit.
  - Fixed debugger v2 documentation (#4843) - thanks [@kevint324](https://github.com/kevint324)

## TensorBoard.dev updates

- Improve upload throughput for scalar summaries (#4825)
- Fixed bug where experiment name and description were not displayed in `tensorboard dev list` (#4912)
- Fixed bug where reading from remote directories did not work in `--one_shot` mode (#4909)

## Breaking changes

- TimeSeries plugin no longer supports `?fastChart=false` fallback to old chart renderer.

# Release 2.5.0

## Features
- New data loading mode: typically loads between 100× and 350× faster
  - On by default when applicable; pass `--load_fast false` to disable
  - For details, or to provide feedback, see #4784
- Time Series
  - Improved line charts with GPU acceleration (#4695)
    - On by default; use `?fastChart=false` to fallback to the older version. Please give us feedback before you use the fallback mechanism.
    - Support manual extent changes (#4711)
  - Monotonic option for "zigzag" charts (#4696)
- Graphs
  - Added toggle to disable high-degree node extraction (#4722)
  - "Color by structure" is now opt-in for large graphs; improves load performance by up to 77% in some cases (#4742)
  - Combine graph by prefixing with unique name (#4334)
- Text
  - Support fenced code blocks in Markdown (#4585)
- Histograms
  - Most recent step gets the most salient color. (#4374)
- Support http server port reuse (#4616) – thanks @zuston.

## Bug fixes
- Graphs
  - Fixed "Download as PNG" button (#4759)
  - Fixed "Ungroup this series" button (#4817)
  - Now collapses more series (abc1, abc2, …, abc5 → abc[1-5]) (#4803)
- Core
  - Removed scrollbars on no data views for plugins (#4525)
  - Error message is JS is disabled (#4401)
- Projector: fix the KNN algorithm caused projections to be incorrect. (#4687)
- Windows: fixed the issue where TensorBoard notebook magic would hang when first launched (#4407, #4300)
- Time series: Time axis on scalar chart read walltime incorrectly (#4541)
- Graph events inconsistently evicted after session log START event (#4743)

## TensorBoard.dev updates
- Text summaries now uploaded

## Breaking changes
- Projector plugin will not work with `--logdir_spec` (#4494) (may not have worked before)
- Drop support for negative `--reload_interval`, which instructed TensorBoard to not read any data at all

# Release 2.4.1

## Bug fixes

- Fixed `--path_prefix` handling (#4423)
- Removed `frame-ancestors *` CSP directive for compatibility with Electron
  embeds (#4332) - thanks [@joyceerhl](https://github.com/joyceerhl)

# Release 2.4.0

The 2.4 minor series tracks TensorFlow 2.4.

## Features

- Improved performance for scalar charts with many runs
  - Up to 50% faster network fetch times in some cases (#4050)
  - Up to 90% faster paint time in some cases (#4053)
- 🧪 **Experimental** Time Series dashboard
  - View scalars, histograms, and images side-by-side in a combined view
  - Customize the color of specific runs
  - Pin specific charts/images/histograms and share a custom view of your data
  - No additional logging required

## TensorBoard.dev updates

- Added support for uploading Hparams (#3916)
  - Try `tensorboard dev upload` on a logdir containing
    [hparams][hparam-tutorial]!

[hparam-tutorial]: https://www.tensorflow.org/tensorboard/hyperparameter_tuning_with_hparams

## Bug fixes

- Docs: fixed image summary tutorial (#4206)
- Projector Plugin: fixed bookmark loading (#4159), thanks aknoerig@!
- Graphs: updated TPU-compatible ops list (#4024)

## Deprecations

TensorBoard features that depend on TensorFlow APIs now require TensorFlow 2.x
installed. Running TensorBoard 2.4.0+ with TensorFlow 1.x installed will not be
supported.

Please note that this does not affect data already written to disk; summaries
emitted by the TF 1.x tf.summary API are still readable and fully supported by
the latest versions of TensorBoard.

Support for Python 3.5 is dropped.

Plugin dashboards have been removed:
- Beholder: see #3843
- Debugger V1: replaced by [Debugger V2][debugger_v2_tutorial]

[debugger_v2_tutorial]: https://www.tensorflow.org/tensorboard/debugger_v2

# Release 2.3.0

The 2.3 minor series tracks TensorFlow 2.3.

## Features

- The 30 sec default reload period is now customizable in the Settings UI
  (#2794)
- 🧪 **Experimental** Debugger V2 is now available; see the
  [tutorial][debugger-v2-tutorial] on how to use the experimental TensorFlow
  APIs to spot NaN's in tensors, view graphs generated from executions, and the
  related lines in the Python source code (#3821)

## TensorBoard.dev updates
- Added support for showing the Distributions tab (#3762)
- Uploader now displays data statistics in the console while uploading data
  (#3678)
- Added new uploader command line flags (#3707)
  - `--dry_run`: causes the uploader to only read the logdir and display
    statistics (if `--verbose` is the default 1) without uploading any data to
    the server
  - `--one_shot`: causes the uploader to exit immediately after all existing
    data in the logdir are uploaded; this mode prints a warning message if the
    logdir doesn't contain any uploadable data
- Upload button in the header offers a convenient, copyable command
- 🧪 **Experimental** DataFrame API: You can now read Scalars data from
  TensorBoard.dev as a Pandas DataFrame (learn more [here][dataframe-tutorial])

[debugger-v2-tutorial]: https://www.tensorflow.org/tensorboard/debugger_v2
[dataframe-tutorial]: https://www.tensorflow.org/tensorboard/dataframe_api

## Bug fixes
- Projector plugin
  - Shows data when logs exist in both logdir root and subdirectory (#3694)
  - Fixed incorrect embeddings from TF2 checkpoints (#3679)
  - Added support for binary format, with 2x speedup loading large tensors in
    some cases (#3685) - thanks [@RustingSword](https://github.com/RustingSword)
  - Added [Colab tutorial][projector-colab] for Projector plugin (#3423)
- Notebooks
  - Increased port scanning from 10 to 100 to better support multi-tenant
    Notebooks (#3780) - thanks [@jerrylian-db](https://github.com/jerrylian-db)
  - Add proxy (e.g. jupyter-server-proxy) support for %tensorboard magics
    (#3674) - thanks [@zac-hopkinson](https://github.com/zac-hopkinson)
    - Set the TENSORBOARD_PROXY_URL environment variable
      `export TENSORBOARD_PROXY_URL="/proxy/%PORT%/"`
- Dynamic plugins (Projector, Fairness Indicators, Profiler, What-If Tool)
  appear when TensorBoard is launched programmatically via Python (#3695)
- Fixed download links in Custom Scalars (#3794)
- Updated broken docs (#3440, #3459, #3561, #3681) - thanks
  [@LexusH](https://github.com/LexusH),
  [@ManishAradwad](https://github.com/ManishAradwad),
  [@ricmatsui](https://github.com/ricmatsui),
  [@robertlugg](https://github.com/robertlugg)
- Better handling of S3-related InvalidRange errors (#3609) - thanks
  [@ahirner](https://github.com/ahirner)
- Fixed deprecated numpy usage (#3768) - thanks
  [@lgeiger](https://github.com/lgeiger)

[projector-colab]: https://www.tensorflow.org/tensorboard/tensorboard_projector_plugin

## Deprecations

- Beholder will be removed in a future release (#3843)
- Debugger (V1) will be removed in a future release, in favor of the
  aforementioned V2 version

## Misc

The frontend now uses Angular (replaces the Polymer entry point, which will be
removed in a future release; still visible at the `/legacy.html` endpoint)
(#3779). If you observe any bugs that do not reproduce under `/legacy.html`,
please file an issue.

For dynamic plugins, please see their respective pages
([Fairness Indicators][fairness-docs], [Profiler][profiler-docs],
[What-If Tool][wit-docs]).

[fairness-docs]: https://github.com/tensorflow/fairness-indicators/commits/master
[profiler-docs]: https://github.com/tensorflow/profiler/commits/master
[wit-docs]: https://github.com/PAIR-code/what-if-tool/blob/master/RELEASE.md

# Release 2.2.2

## Features

- Some performance improvements to line charts (#3524)
- Performance improvements in the Text plugin due to batch HTML
  sanitization (#3529)
- Performance improvements in backend markdown cleaning for tag
  rendering (#3599)
- CSS/layout performance optimization by applying layout/layer bound where
  possible (#3642)
- The `tensorboard dev list` subcommand now reports the total size of stored
  tensors (used as the backing storage type for Histograms) (#3652)

## TensorBoard.dev updates

- TensorBoard.dev now supports the Histograms plugin, for experiments
  uploaded starting from this release
  - The `tensorboard dev upload` subcommand now sends the histograms, when
    available, so that it can be rendered via the Histograms plugin on
    TensorBoard.dev
- This release may support additional plugins in the future, once those plugins
  are enabled in the TensorBoard.dev service

## Breaking changes

- The experimental and legacy SQLite support (via the `--db_import` and `--db`
  flags) is removed to ease maintenance (#3539)

# Release 2.2.1

## TensorBoard.dev updates

- TensorBoard.dev now renders model graphs, for experiments uploaded starting
  from this release.
  - The `tensorboard dev upload` subcommand now sends the model graph, when
    available, so that it can be rendered via the Graphs plugin on
    TensorBoard.dev.
  - Large node attribute values (which would not be rendered anyway) are
    filtered out before upload.
  - Graphs that remain larger than 10MB after filtering are not uploaded.
- The `tensorboard dev upload` command supports a `--plugins` option to
  explicitly indicate the desired plugins for which summary data should be
  uploaded (#3402, #3492)
- The `tensorboard dev list` subcommand now reports the total size of stored
  binary objects (e.g., graphs) for each experiment (#3464)
- The `tensorboard dev list` subcommand now accepts a `--json` flag to allow
  parsing the output more easily (#3480)

## Features

- Auto-reload is now disabled when the browser tab is not visible, saving
  network bandwidth (#3483)
- New logo used in the favicon (#3406)

## Bug fixes

- Plugin loading: When a plugin fails to load, TensorBoard logs an error and
  continues, instead of crashing (#3484, #3486)
- Eliminated sporadic HTTP 500 errors for XHRs that do markdown rendering (#3491)

# Release 2.2.0

The 2.2 minor series tracks TensorFlow 2.2.

## Features

- Profile plugin now should be pip installed from `tensorboard-plugin-profile`.
  The new version works in Chrome 80 and Firefox, has better model insights and
  will be more actively maintained.
- Add S3_ENDPOINT variable (#3368)  - thanks @thealphacod3r
- Confirm that the connection to tensorboard works or change to localhost
  (#2371) - thanks @miguelmorin
- Update --reload_multifile_inactive_secs default to 24 hours (#3243)
- New `tensorboard dev update-metadata` command allows for updating the name and
  description of experiments (#3277)
- Improved organization of artifacts downloaded during export from
  TensorBoard.dev (#3307)

## Bug fixes

- Fix for #3282 where the tooltip would remain even after the mouse leaves the
plot (#3347)
- Internal fix: HParams summary protos now properly include tensor values (#3386)
- Fixes to profiling tutorial (#3372 & #3381)

## Breaking Changes
- Note: As of TensorBoard 2.1.1+, only Python 3 is supported. There will be no
further releases for Python 2 as per
https://groups.google.com/a/tensorflow.org/forum/#!topic/developers/ifEAGK3aPls


# Release 2.1.1

## Features

- Uploader: Added ability to upload and modify experiment name and description (#3277)

## Breaking changes

- As per
  https://groups.google.com/a/tensorflow.org/forum/#!topic/developers/ifEAGK3aPls
  this patch does not support Python 2.  Only Python 3 is supported


# Release 2.1.0

The 2.1 minor series tracks TensorFlow 2.1.

## Features

- Debugger: added ability to display Tensors as images, with selectable color map and zooming (#2729, #2764)
- What-If Tool improvements:
  - Added ability to set custom distance function for counterfactuals (#2607)
  - Added ability to explore counterfactual examples for regression models (#2647)
  - Added ability to consume arbitrary prediction-time information (#2660)
  - Added ability to slice performance statistics by numeric features (in addition to categorical features) (#2678, #2704).
  - Added PR/ROC curves by class for multi-class classification models (#2755)
- Improvements for plugin developers:
  - Added support for communication between TensorBoard and plugins in iframes (#2309, #2703)
  - (Experimental) Added library for improved plugin integration (#2708)
  - Enabled dynamic plugins in TensorBoard within Colab (#2798)
- Security improvements, e.g. Content Security Policy configurations
- Reduced overhead of image, audio, and histogram summary writing API methods (#2899)  - thanks @hongjunChoi

## Bug fixes

- What-If Tool:
  - Fixed sometimes-stuck threshold sliders (#2682)
  - Fixed PD plots in notebook mode with py3 kernels (#2669)
  - Fixed info dialogs re. Fairness optimization (#2694)
- Scalars dashboard: fixed unreliable data loading over slow network connections (#2825)
- Fixed potential corruption when reading files from disk, when TensorFlow is not installed (#2791)
- Fixed writing of histogram summaries when using TPUs (#2883) - thanks @hongjunChoi

## TensorBoard.dev updates

- The `tensorboard dev list` subcommand now provides detailed metadata about
  each experiment.

# Release 2.0.2

## Features

- Improvements to [TensorBoard.dev] support:
  - New `tensorboard dev list` subcommand lists all experiments uploaded to
    TensorBoard.dev (#2903)
  - In the event of a transient backend issue or permanent breaking change, the
    uploader can now gracefully degrade and print a diagnostic (#2879)

[TensorBoard.dev]: https://tensorboard.dev/

# Release 2.0.1

## Features
- Preview of TensorBoard.dev uploader! Check out <https://tensorboard.dev/> for
  information and usage instructions.

# Release 2.0.0

The 2.0 minor series tracks TensorFlow 2.0.

## Breaking changes

- TensorBoard now serves on localhost only by default to avoid unintentional
  overexposure. To expose TensorBoard to the network, either use a proxy, bind
  to a specific hostname or IP address by using the `--host` flag, or explicitly
  enable the previous behavior of binding on all network interfaces by passing
  the flag `--bind_all`. See PR #2589.

- The `--logdir` flag no longer supports passing multiple comma-delimited paths,
  which means that it now *supports* paths containing literal comma and colon
  characters, like `./logs/m=10,n=20,lr=0.001` or `./logs/run_12:30:15`. To
  mimic the old behavior, prefer using a tree of symlinks as it works with more
  plugins, but as a fallback the flag `--logdir_spec` exposes the old behavior.
  See PR #2664.

- Projector plugin `visualize_embeddings()` API now takes `logdir` as its first
  parameter rather than `writer` (which only supported TF 1.x summary writers).
  For backwards compatibility TF 1.x writers will still be accepted, but passing
  the logdir explicitly is preferred since it works without any dependency on
  TF 1.x or 2.x summary writing. See PR #2665.

- The namespace `tensorboard.summary.*` now aliases the summary API symbols in
  `tensorboard.summary.v2.*` rather than those in `tensorboard.summary.v1.*`.
  The old symbols can still be accessed under the `.v1` names. Note that the
  new v2 API symbols are exposed in TF 2.0 as the new `tf.summary.*` API and
  this is normally how they should be used. See PR #2670.

## Features

- Smarter log directory polling can be used by passing `--reload_multifile=true`
  to poll all "active" event files in a directory rather than only the last one.
  This avoids problems where data written to the non-last file never appears.
  See PR #1867 for details, including how to adjust the "active" threshold.

- What-If Tool now can sort PD plots by interestingness (#2461)


# Release 1.15.0

The 1.15 minor series tracks TensorFlow 1.15.

## Features
- Embeddings projector now shows sprite images in the nearest neighbors list
  (#2543) - thanks @beasteers
- When recording hyperparameters, the trial ID can now be customized, for easier
  integration with existing tuner systems (#2442)
- Improvements to Colab and Jupyter notebook integration:
  - The `TENSORBOARD_BINARY` environment variable can now be set to invoke a
    non-default `tensorboard` binary (#2386)
  - Error messages are now clearer when the TensorBoard binary fails to launch
    (#2395)
  - The `%tensorboard` magic no longer spams log messages when a different
    version of TensorBoard is already running on the same machine (#2470)
  - The `%tensorboard` magic can now be used in Jupyter notebooks running on
    hosts other than `localhost` (#2407)
- What-If Tool improvements:
  - Errors running inference are now surfaced in the What-If Tool UI (#2414)
  - Median error stats are now displayed in addition to mean error stats (#2434)
- Mesh plugin improvements:
  - Now compatible with TensorFlow 2.0 via a new `summary_v2` module (#2443)
  - The number of vertices in the mesh can now be dynamic (#2373)
- Profile dashboard improvements:
  - Wasted time now appears in the node table, and can be used as a sort key
    (#2525)
  - Memory bandwidth utilization now appears in the dashboard header (#2525)
- Improvements for plugin developers:
  - Plugins can now be rendered in an iframe whose source is served from the
    plugin backend, eliminating the need to bundle a frontend with the
    TensorBoard binary
  - Plugins can now be discovered dynamically and loaded at runtime, by defining
    a `tensorboard_plugins` entry point
  - See our [example dynamically loaded plugin][example-plugin] for a plugin to
    use as a starting point, plus documentation
  - TensorBoard now uses Polymer 2.7 (#2392, et al.)

[example-plugin]: https://github.com/tensorflow/tensorboard/tree/1.15/tensorboard/examples/plugins/example_basic#readme

## Bug fixes
- #2614 - "Toggle All Runs" button now behaves correctly on the first click when
  many runs are loaded (PR #2633)
- Scalar charts should no longer "become tiny" on certain kinds of rendering
  failures (PR #2605)
- #2028 - TensorBoard now logs less verbosely with Werkzeug 0.15.0 and up; it
  now behaves the same across Werkzeug versions (PR #2383)
- The What-If Tool can now properly compare two regression models in the initial
  Facets Dive view (PR #2414)
- Embedding projector metadata view now wraps long strings correctly (PR #2198)


# Release 1.14.0

## Features
- New hyperparameters dashboard: see [tutorial and demo][hparams-docs] and
  [summary APIs][hparams-apis]
- New dashboard for visualizing meshes and point clouds: see
  [README][mesh-readme]
- Graph dashboard now shows Keras conceptual graph: see [tutorial and
  demo][conceptual-graph-docs]
- Embedding projector now supports the [UMAP dimensionality reduction
  algorithm][umap] ([learn more about UMAP here][umap-tutorial]) (#1901) -
  thanks @cannoneyed
- [TensorBoard notebook support][notebook-docs] is stabilized: in a Colab or
  Jupyter notebook, run `%load_ext tensorboard` followed by `%tensorboard
  --logdir ./path/to/logs`
- Profile dashboard improvements:
  - New pod viewer tool to analyze TPU performance (#2111)
  - Now allows capturing profiles from TensorBoard (#1894)
- What-If Tool improvements:
  - Now available as a notebook widget for Jupyter and Colab: see
    [demo][witwidget-demo]
  - Now shows PR curves and F1 score (#2264)
  - Now supports Cloud AI Platform, including XGBoost models (#2194)
  - Now shows feature-level attributions for individual predictions, as
    applicable (#2252)
- Image dashboard now allows scrolling for large images (#2164) - thanks @lr1d
- Scalar chart smoothing now caps at 0.999 for convenience (#1974) - thanks
  @flostim
- Scalar chart scroll-to-zoom behavior now requires holding `Alt` (#2221)
- `tensorboard` now supports a `--version` command line argument (#2097) -
  thanks @shashvatshahi1998
- Python API now defines `tensorboard.__version__` in addition to
  `tensorboard.version.VERSION` (#2026)

## Bug fixes
- Projector metadata card now formats long words properly (PR #2016) - thanks
  @makseq
- #2010 - `.tensorboard-info` is now world-writable for multi-user \*nix systems
  (PR #2131)
- #1989 - `importlib.reload(tensorboard)` now works properly (PR #2005)

[conceptual-graph-docs]: https://www.tensorflow.org/tensorboard/r2/graphs
[hparams-apis]: https://github.com/tensorflow/tensorboard/blob/1.14/tensorboard/plugins/hparams/api.py#L15
[hparams-docs]: https://www.tensorflow.org/tensorboard/r2/hyperparameter_tuning_with_hparams
[mesh-readme]: https://github.com/tensorflow/tensorboard/blob/1.14/tensorboard/plugins/mesh/README.md#mesh-plugin
[notebook-docs]: https://www.tensorflow.org/tensorboard/r2/tensorboard_in_notebooks
[umap-tutorial]: https://umap-learn.readthedocs.io/en/latest/how_umap_works.html
[umap]: https://github.com/lmcinnes/umap#umap
[witwidget-demo]: https://colab.research.google.com/github/tensorflow/tensorboard/blob/1.14/tensorboard/plugins/interactive_inference/What_If_Tool_Notebook_Usage.ipynb


# Release 1.13.1

## Bug fixes
- #1895 - Fix `strftime`-related launch error on Windows (PR #1900)
- #1794 - Fix What-If Tool loading examples without inference (PR #1898)
- #1914 - Disable the profile dashboard inside Colab, where it doesn’t work
- #1945 - Fix profile dashboard loading behavior


# Release 1.13.0

The 1.13 minor series tracks TensorFlow 1.13.

Compatibility note: As of 1.13, TensorBoard has begun transitioning its own use
of some TensorFlow APIs to align with their naming in TF 2.0, and as a result
TensorBoard 1.13+ strictly requires TensorFlow 1.13+.

## Features
- What-If tool notebook mode and general improvements
  - Now usable directly inside Jupyter and Colab notebooks (#1662, #1745, #1788)
  - Added comparison of multiple models (#1589, #1672)
  - Added CSV loading model (#1597)
  - Added global partial dependence plots (#1604)
  - Added custom prediction function support (#1842)
- (Alpha) TensorBoard can be embedded inside Juptyer and Colab notebooks via a
  `%tensorboard` magic, after loading the `tb.notebook` extension (#1813, #1822)
- Profile dashboard overview page now shows step time breakdown (PR #1683)
- Line chart "log" scale is now a true log scale (#1507)
- When no --port flag is specified, TensorBoard will now search for open ports
  near the default port (6006) if that port is already in use (#1851)

## Performance improvements
- Faster event file loading by caching runtime check (PR #1686) - thanks @abiro

## Bug fixes
- #786 (partial) - Avoid trying to smooth plots of constant y-value (PR #1698)
- #1515 - Fix image right-click accessiblity in non-Chromium browsers (PR #1561)
- #1541 - Fix --event_file flag when using --inspect
- #1566 - Fix error on trying to import "google.protobuf.pyext" (PR #1887)
- #1567 - Fix display bug on line chart after toggling series selection
- #1598 - Fix clipping in graph dashboard PNG download (PR #1600)
- #1601 - Fix chart SVG download option in Firefox
- #1623 - Fix --path_prefix interpretation
- #1838 - Fix run selector synchronization across already-loaded dashboards


# Release 1.12.2

## Bug fixes
- #1620 - Fix path_prefix flag regression (PR #1623)
- #1704 - Fix debugger sidebar resizer


# Release 1.12.1

## Bug fixes
- #1549 - Run names wrap at all character (PR #1602) - thanks @dgrahn
- #1610 - Fix Download as PNG for large graph
- #1684 - Fix bug rendering debugger plugin (PR #1550) - thanks @longouyang


# Release 1.12.0

The 1.12 minor series tracks TensorFlow 1.12.

## Features
- New download-as-SVG option for scalar dashboard charts (#1446)
- Image dashboard should now detect and render SVG images (#1440)
- What-If Tool example viewer/loader improvements:
  - Support for sampling examples to load (#1504)
  - Support for viewing SequenceExamples (#1513)
  - Improvements to saliency viewing/sorting (#1472)
- Profile tool shows per-program breakdown, idle time, and ops left out (#1470)

## Bug fixes
- #1463 - What-If tool now handles classes with blank labels (PR #1471)
- #1468 - Reduce clipping in graph plugin sidebar
- #1475 - Restore tag filter persistence to URL param and across dashboards
- #1477 - Fix bug rendering TPU profile dashboard overview page
- #1480 - Fix projector hanging due to infinite loop (PR #1481)
- #1491 - Restore spinner on line charts when loading data
- #1499 - Fix stale/incorrect line charts when filtering by tag (PR #1500)
- #1505 - Fix 404 console errors in Firefox - thanks @wdirons
- #1506 - Fix --purge_orphaned_data to allow passing false (PR #1511)
- #1508 - Make custom scalars chart ignore outliers functionality work
- #1524 - Preserve line chart zoom level when data refreshes


# Release 1.11.0

The 1.11 minor series tracks TensorFlow 1.11.

## Highlights
- New What-If Tool dashboard, which provides a simple, intuitive, and powerful
  visual interface to play with a trained ML model on a set of data with
  absolutely no code required. See for details:
  https://github.com/tensorflow/tensorboard/tree/1.11/tensorboard/plugins/interactive_inference

## Features
- Graph dashboard now supports coloring nodes by XLA cluster (PR #1336)
- Last updated time appears in tooltip for refresh button (PR #1362)
- Line charts support pan w/ shift key, zoom w/ scroll wheel (PR #1429, #1456)

## Performance improvements
- Better UI animation/scrolling performance (#1311, #1357)
- Reduced Plottable MouseInteraction overhead on hover (#1333/#1329)
- Optimized line chart tooltip redraw behavior (#1355)

## Bug fixes
- #982  - Fix spurious 404s for /[[_dataImageSrc]] or /[[_imageURL]] (PR #1315)
- #1320 - Fix port binding to disallow confusing IPv4/IPv6 port reuse (PR #1449)
- #1397 - Fix multi-part logdirs to correct expand ~ for user homedir
- #1396 - Fix "step" chart axis to show only integer ticks
- #1389 - Fix scalar card titles to omit common prefix (PR #1399)
- #1403 - Fix scalar chart shrinking problem on fast page changes
- #1406 - Fix scalar chart tooltip display to better avoid clipping


# Release 1.10.0

The 1.10 minor series tracks TensorFlow 1.10.

## Changes
- New logic for loading/launching TensorBoard (PR #1240)
  - Plugin loading now uses new TBLoader API
  - Argument parsing now uses argparse
  - New `tb.program.launch()` API to launch TB from within Python
- Sidebars adjusted to be consistent across plugins (PR #1296)
- tb.summary.image() param order fixed to h, w (PR #1262) - thanks @ppwwyyxx
- New TPU profile dashboard progress bar for loading tools (PR #1286)

## Bug fixes
- #1260 - Fix missing pie chart in TPU profile input pipeline analyzer
- #1280 - Fix TPU profile memory viewer issue with XLA compatibility
- #1287 - Fix dangling UI interaction layer issue in vz-line-chart
- #1294 - Fix custom scalar dashboard to de-duplicate charts - thanks @lgeiger


# Release 1.9.0

The 1.9 minor series tracks TensorFlow 1.9.

## Highlights

- Improved performance with log directories on GCS (Google Cloud Storage) with
  faster traversal time and reduced bandwidth consumption (PRs #1087, #1226)
- Profile dashboard improvements, including:
  - New memory viewer tool that visualizes peak memory usage (#1223)
  - Trace viewer tool now supports streaming mode, that dynamically renders a
    much longer trace (#1128)
  - Op profile tool now shows memory utilization in op details card (#1238)
  - Profile dashboard now supports visualizing data from multiple hosts (#1117)

## Features
- Graph dashboard now allows searching nodes by regex (#1130)
- New --samples_per_plugin flag to control how many samples are kept (#1138)
- Better error when --logdir/--db flag is omitted (#1189) - thanks @oxinabox
- Debugger plugin can now show single elements of string tensors (#1131)

## Bug fixes
- #1107 - Beholder plugin should no longer reserve GPU (PR #1114)
- #1190 - Beholder plugin summary placeholder no longer interferes with normal
          summary use and/or Estimator - thanks @TanUkkii007 (PR #1148)
- #427 and #588 - removed pip package deps on bleach and html5lib (PR #1142)
- #1191 - fixed debugger plugin UnboundLocalError - thanks @cfroehli
- #1200 - fixed debugger plugin binary-valued string tensor issues
- #1201 - fixed "dictionary changed size" race condition in reloader (PR #1235)


# Release 1.8.0

The 1.8 minor series tracks TensorFlow 1.8.

## Bug fixes

- #1082 - fixes rendering for certain graphs with metaedges/function nodes
- #1097 - correction to debugger plugin keras code snippet (PR #1100)
- #1111 - event reader logic now supports TF 1.8 GetNext() API (PR #1086)


# Release 1.7.0

The 1.7 minor series tracks TensorFlow 1.7.

## Highlights

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
