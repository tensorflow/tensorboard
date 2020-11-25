# TensorBoard generic data APIs and implementations

@wchargin, 2019-07-25

**Status:** Specified in Python; multiple implementations underway, at various
stages.

## Purpose

TensorBoard has historically run as a local web server that reads data directly
from disk. But [TensorBoard.dev][tbdev] runs on App Engine and reads data that
users have uploaded to our hosted service, and some Google-internal
TensorBoard-like services have their own databases and reimplement the
TensorBoard HTTP APIs directly.

To ensure that the TensorBoard experience is uniform across all backends, and to
make it as easy as possible for plugins to work in all environments, we need a
single Python API (with multiple implementations) for storing and accessing
data.

This document proposes the read side of that API, and describes at a high level
how it can be implemented in each backend of interest.

[tbdev]: https://tensorboard.dev

## Ontology

Most TensorBoard plugins can be naturally expressed via one or more relational
schemas:

-   **scalars:** *(run, tag, step) → (value: f32)*
-   **images:** *(run, tag, step, image_index) → (image_data: blob)*
-   **audio:** *(run, tag, step, audio_index) → (wav_data: blob)*
-   **text:** *(run, tag, step, text_index) → (text_data: blob)*
-   **histograms:** *(run, tag, step, bucket_index) → (lower_bound: f32, count:
    usize)*
-   **PR curves:** *(run, tag, step, threshold_index) → (tp, fp, tn, fn,
    precision, recall)*
-   **mesh:**
    -   vertices: *(run, tag, step, vertex_index) → (x: f32, y: f32, z: f32,
        color: u8)*
    -   faces: *(run, tag, step, face_index) → (v1: usize, v2: usize, v3:
        usize)*
-   **graphs:** *(run, tag, kind: enum) → (graph: proto)*
-   **hparams:**
    -   experiment config: *() → (experiment_info: proto)*
    -   session groups: *(session_group) → (session_info: proto)*

We could permit plugins to define these tables directly, and operate on them
with the power of a relational database at their disposal. However, this would
be a strong commitment. It would limit our flexibility in implementing these
APIs, and we already know that we’ll need at least three implementations. And if
some fancy new plugin is a poor fit for this model, the model will impose a lot
of baggage to work around.

Instead, we observe three common patterns in the above relations, and privilege
them:

-   **Time series of scalars.**
    -   Primarily used by the scalars plugin.
    -   Keyed within an experiment by run, tag, and step.
-   **Time series of tensors.**
    -   Includes histograms and PR curves.
    -   Keyed within an experiment by run, tag, and step.
    -   The size of each tensor is bounded above by a constant (0.5&nbsp;KB for
        histograms, 5&nbsp;KB for PR curves) that is small compared to the Cloud
        Spanner cell size of 10&nbsp;MiB.
-   **Time series of blob sequences.**
    -   Includes images, audio, text, meshes, graphs, hparams.
    -   Potential future use case: video.
    -   May be “conceptually tensors” (like images, audio) but actually encoded
        in a compressed format (like PNG, FLAC).
    -   Keyed within an experiment by run, tag, step, and index.
    -   Includes the degenerate cases where the “sequence” always contains
        exactly one element or the “time series” always contains exactly one
        step.
    -   Why blob sequences rather than just blobs? Images and audio summaries
        can each include multiple images/audio clips per step. Privileging
        sequences lets us handle this nicely, by storing just a single PNG file
        in each GCS object and serving those directly to the browser. There’s
        little downside.
    -   May be small or large. Images could be kilobytes (MNIST inputs) or
        gigabytes ([tissue biopsies][biopsies], TensorFlow graphs and
        checkpoints).
    -   Implementations may encrypt these specially (e.g., with GCS
        [CMEK][gcs-cmek]s): sensitive data is usually contained in such blobs
        rather than in, say, scalars or histograms.
    -   Sequence length typically has a small upper bound. The default length is
        3 for images and audio, and meshes are always singleton sequences.

Note that we separate scalars from arbitrary tensors. Scalars can support some
operations that arbitrary tensors cannot, such as aggregation by min/max value
in a range, or queries like “find runs with most recent `accuracy` at least
0.9”. The scalar dashboard is also the most widely used dashboard, so we’ll want
to take advantage of any extra performance improvements that we can: for
example, we don’t have to store tensor shapes.

[biopsies]: https://iciar2018-challenge.grand-challenge.org/Dataset/
[gcs-cmek]: https://cloud.google.com/storage/docs/encryption/customer-managed-keys

## API calls

Each storage class has two API calls: “list metadata” and “get values”. All API
calls require the caller to filter by a plugin that owns the data (e.g.,
“images”). All API calls require an “experiment ID” parameter and an
authentication token. Further details of the signatures:

-   Scalar time series: For now, same as tensor time series. May learn new
    options later.
-   Tensor time series:
    -   Supports filtering by sets of runs and sets of tags (cross product
        semantics).
    -   Supports filtering by range of steps, or the special “most recent k
        steps”.
    -   Downsampled to a provided number of steps.
    -   Returns a nested map:
        -   for data requests: *(run) → (tag) → list[(step, wall_time,
            tensor_value)]*;
        -   for metadata requests: *(run) → (tag) → (max_step, max_wall_time,
            summary_metadata)*.
-   Blob sequence time series:
    -   Supports filtering by sets of runs and tags.
    -   Supports filtering by range of steps, or the special “most recent step”.
    -   Supports filtering by range of indices, or the special “most recent
        index”.
    -   Downsampled to a provided number of steps.
    -   Returns a nested map:
        -   for data requests: *(run) → (tag) → list[(step, wall_time,
            list[(blob_key)])]*;
        -   for metadata requests: *(run) → (tag) → (max_step, max_length,
            summary_metadata)*.

Note that the downsampling is supported along the “step” axis only.

Each “get values” API call will enforce an upper bound on the maximum size of
the response, computed as *num_runs* × *num_tags* × *sample_size*. (Recall that
elements of a tensor time series are expected to be small.)

A “blob key” is a tagged union of either a user-accessible absolute URL or an
opaque key. Blobs with opaque keys can be read with one additional API call:

-   Blob reading:
    -   Takes an opaque_key input as returned by a blob sequence query.
    -   Returns the contents of the specified blob.
    -   Additionally exposed as a core HTTP endpoint, `/data/blob/OPAQUE_KEY`,
        for plugins that want to render `<img>`/`<audio>`/etc. elements directly
        with DOM APIs.

Finally, plugins start their search from a top-level API call:

-   Listing:
    -   Takes a plugin identifier (e.g., “images”).
    -   Returns a map of *(run) → (tag) → (kind, summary_metadata)*, where
        *kind* identifies one of the four storage classes.

Note that these API calls are intended to be called by TensorBoard plugin code,
and thus map fairly closely onto those expected access patterns. We may later
provide additional APIs for end users, both for more convenient ad hoc
exploration and for batch analysis or creating custom dashboards—say, by
exporting directly to a `pandas` dataframe for use in Colab. Those APIs could be
implemented on top of the APIs described in this document.

## Storage implementations

This section describes possible implementations of these APIs. It is
informative, not normative.

A **hosted backend** is our desired steady state for a public service:

-   All data is ingested into Cloud Spanner or GCS at upload time.
-   Scalar time series are stored in a Spanner table mapping candidate key
    *(run_id, tag_id, step)* to wall time and floating-point value.
-   Tensor time series are stored in a Spanner table mapping candidate key
    *(run_id, tag_id, step)* to wall time, bytestring of
    [packed tensor content][tensor-content], and tensor shape and dtype.
-   Blob sequence time series are stored on GCS, and listed in a table mapping
    candidate key *(run_id, tag_id, step, index)* to GCS object key. (Even for
    small objects.)
-   A separate table stores run and tag names and summary metadata, keyed by ID.
-   Linearly bucketed downsampling can be implemented in SQL, as in
    [PR&nbsp;#1022][pr-1022].
-   Uniformly random downsampling, should we want it, comes for free with
    [Cloud Spanner’s `TABLESAMPLE` operator][tablesample], which allows either
    Bernoulli sampling or reservoir sampling.
    -   `TABLESAMPLE` is [part of SQL:2011][tablesample-sql2011], and is also
        implemented by PostgreSQL and SQL Server, but not by SQLite. (Neither
        “tablesample” nor “downsample” has ever appeared in the sqlite-users
        mailing list.) Cloud Spanner does not implement the `REPEATABLE(seed)`
        portion of the operator.

[pr-1022]: https://github.com/tensorflow/tensorboard/pull/1022
[tablesample-sql2011]: https://jakewheat.github.io/sql-overview/sql-2003-foundation-grammar.html#sample-clause
[tablesample]: https://cloud.google.com/spanner/docs/query-syntax#tablesample-operator
[tensor-content]: https://github.com/tensorflow/tensorflow/blob/48b2094fd691bf2db96096d739afb23ff6807e33/tensorflow/core/framework/tensor.proto#L31-L36

In time, a **local SQLite backend** could be implemented on top of TensorBoard’s
DB mode:

-   All data is ingested into SQLite at [`--db_import` time][db-import].
-   Scalar/tensor time series are stored in tables isomorphic to their Cloud
    Spanner counterparts.
-   Blob sequence time series are stored in a table mapping *(run_id, tag_id,
    step, index)* to a unique blob ID.
-   Blob data is stored in a table mapping *blob_id* to the actual blob data.
    (This is “GCS”.)
-   A separate table stores run and tag names and summary metadata, keyed by ID.
-   Note that SQLite blobs have a 1&nbsp;GB size limit. We leave open the option
    of adding a chunk_index column to the blob data table, enabling us to store
    arbitrarily large blobs.
-   Linearly bucketed downsampling can be implemented in SQL, as in
    [PR&nbsp;#1022][pr-1022].
-   Uniformly random downsampling has no builtin. If we want it, we’ll have to
    choose an implementation: naïve modulo (bad for periodic data or
    non-sequential steps), `ORDER BY random()` (bad for reproducibility;
    potentially slow), `WHERE random() < k` (Bernoulli sampling; bad for
    reproducibility; maybe fine otherwise), `WHERE rowid IN xs` for `xs` a list
    of indices pre-computed on the client (maybe fine?), `JOIN` with a global
    table mapping step to a uniformly random number and limit to the top `k`
    random values (maybe fine?).

[db-import]: https://github.com/tensorflow/tensorboard/blob/0e9a000a1ef484762e743335a6b5754154bd9cdd/tensorboard/plugins/core/core_plugin.py#L334-L341

As a migration path for Google-internal users, we’ll provide a backend that
interfaces with existing Google-internal storage systems for experiment data.
(Googlers, see internal version of this doc for details.)

Similarly, for compatibility with existing TensorBoard data on disk, we’ll
provide a backend that uses the same loading logic as in current TensorBoard
(the `plugin_event_multiplexer` stack) and exposes data via these APIs. It will
serve as a bridge from the past to the future, and ensure that there is a
continuous migration path that doesn’t require a giant, scary global flag flip.

## Alternatives considered

### Expose relational storage model to plugins

Discussed in “Ontology” section. We explored this approach with a proposal that
allowed plugins to declare zero or more relations, in the form of
*(candidate_key) → (columns)*; these are the relations listed in the “Ontology”
section above. Relation dimensions would be drawn from a fixed set of types:
scalar types `i64`, `f64`, and `bool`; metadata types `run_id`, `tag_id`, and
`step`; and blob types `bytes`, `string`, and `large_file`. Plugins would be
able to query by specifying a pattern for each prime attribute:

-   “any value”
-   “one of these `values`”
-   for step-type attributes: “downsample to `k`”, interpreted relative to
    `run_id` and `tag_id` attributes

…and specifying whether to include or exclude each non-prime attribute in the
result set. For example:

-   scalars:
    -   relation `data`: *(run_id, tag_id, step) → (value: f64)*
    -   query `data` (*run_id* in `RUNS`, *tag_id* in `TAGS`, *step* downsample
        `1000`) → *value*
-   images:
    -   relation `data`: *(run_id, tag_id, step: image_index: i64) → (blob:
        large_file)*
    -   query `data` (*run_id* in `RUNS`, *tag_id* in `TAGS`, *step* downsample
        `100`, *image_index* ANY) → *blob*

As discussed above, we chose not to pursue this option because it exposes a lot
of flexibility that we would be bound to support, and also has a high conceptual
surface area (e.g., a custom domain-specific query language).

### For local backend, store blobs in filesystem rather than SQLite

There would effectively be no per-blob size limit. Should we opt to retain
references into the original logdir (e.g., “event file path plus byte offset
into file”) rather than copying the data to our own storage, this would reduce
data duplication. In the case that SQLite itself is a bottleneck, rather than
the underlying I/O, this could also take some pressure off of concurrent
requests.

Where would we store the files? Currently, TensorBoard’s DB mode stores all data
in a single database, which is a single file on disk. This is a simple and
convenient model. Storing additional files means that we have to either require
that they be colocated with the rest of the data (which makes the system harder
to copy, share, back up, etc.) or claim some global TensorBoard data directory
like `${XDG_DATA_HOME}/tensorboard/blobs/` (which is a bigger commitment and
requires more care).

Note that some TensorBoard plugins, like the projector, already do read from
absolute filepaths in their data model. The resulting non-portability of logdirs
has indeed been a pain point.

How would we store the files? One way or another, we’ll end up building some
kind of miniature database, taking on all the associated burdens. If, for
instance, we use a hierarchy of filepaths like
`${run_id}/${tag_id}/${step}/${index}`, then reading the most recent blob for
each tag in a run will be quadratic(!) in both the number of tags and the number
of steps, because `open`(2) needs to linearly scan through a list of all
filenames in the enclosing directory. Perhaps we’d address this by hashing and
sharding, like Git’s object store does—adding even more complexity. Poorly
performing filesystems; network filesystems; multi-user systems and permissions.
I’m going to declare that implementing a database is out of scope for this
project.

And the hypothetical performance gains aren’t clear:
[SQLite can be faster than the filesystem!][fasterthanfs]

[fasterthanfs]: https://www.sqlite.org/fasterthanfs.html

### Include an “atemporal blobs” storage class

All three proposed storage classes are time series: of scalars, tensors, or blob
sequences. A previous version of this document proposed a fourth storage class
for *atemporal blobs*, keyed within an experiment by run and tag only. The
intended purpose was for “run-level metadata”. Existing solutions for this use
case do indeed use summaries: e.g., a summary with special tag name
`_hparams_/session_start_info` specifies hyperparameter configurations. But this
has always been a bit of a hack. Ideally, run-level metadata would be part of a
more integrated system. For instance, it could be used to drive run selection
(“show me only runs that used the Adam optimizer, across all plugins”).
Summaries aren’t a good fit for this data in the first place.

Such a storage class can be implemented in terms of existing storage classes by
representing an atemporal blob as a singleton blob sequence sampled only at step
0. In TensorFlow 2.x, even graphs may not be static over the course of a run
([`trace_export`][trace-export] takes a `step` parameter), and in some senses
hyperparameters need not be, either. With few compelling use cases and a
graceful fallback, we have dropped this storage class.

[trace-export]: https://www.tensorflow.org/versions/r2.0/api_docs/python/tf/summary/trace_export

## Changelog

-   **2020-01-22:** Changed blob sequence `corresponding_max_index` (length of
    most recent datum) to `max_length` (maximum length of any datum), which is
    what is actually needed and is also more natural.
-   **2019-08-07:** Revised due to design review feedback: removed atemporal
    blobs (see “Alternatives considered” section).
-   **2019-07-25:** Initial version.
