# TensorBoard generic data ingestion

@wchargin, 2019-12-04

**Status:** Under implementation.

## Purpose

Summaries on disk are all in tensor form\*, but data from different plugins
correspond to different data classes—scalars, tensors, or blob sequences, from
the [generic data APIs design doc][data-apis] and specified in the
[`DataProvider` Python interface][data-provider]. Some require little or no
preprocessing: e.g., scalars and histograms. Others require transformations:
e.g., for audio, we transform the tensor data and embed it into one blob
sequence and one tensor time series.

We therefore need some mechanism by which plugins can define how their data is
to be ingested. This mechanism should be used for both the local TensorBoard web
server and the TensorBoard.dev uploader.

\* For old data, they may not literally be stored as tensors, but they’re
converted to this form very early on in the loading process by `data_compat.py`,
so it suffices to think of all data as v2-style summaries.

[data-apis]: ./generic_data_apis.md
[data-provider]: https://github.com/tensorflow/tensorboard/blob/a0c1def1e3a3725909f9fd59ee5d50fda81bb7ea/tensorboard/data/provider.py#L29

## Sample mappings

To set the stage, consider how existing first-party TensorBoard plugins will
want to ingest data, based on the ways that they currently write tensor
summaries to disk:

-   **scalars:** Data is asserted to be a rank-0 tensor of floating-point dtype.
    Its tensor structure is forgotten, and it is embedded into a scalar time
    series.
-   **histograms:** Data is asserted to be of [shape *[k, 3]*][histo-shape] and
    of floating-point dtype, and is embedded unchanged into a tensor time
    series.
-   **PR curves:** Same as histograms, but [shape is *[6, k]*][pr-curves-shape].
-   **images:** Data is asserted to be a rank-1 bytestring tensor of size at
    least 2, where the first two elements contain ASCII representations of the
    images’ width and height, and subsequent elements represent PNG-encoded
    image data. This tensor is embedded unchanged\* into a blob sequence time
    series.
-   **audio:** Mostly like images, but what do we do about
    [the labels][audio-labels]? Some users really wanted them
    ([“Ability to include text annotations would be amazing”][audio-labels-request]).
    We could store them in a separate tensor summary, perhaps, tied together by
    naming or summary metadata.
-   **text:** Text is usually short, so we’ll simply require that the total size
    of a text tensor be at most 10 MiB. Note that text tensors can be of
    arbitrary rank; higher-rank tensors are rendered as a table in the frontend.
    If we really needed to support arbitrary-sized text summaries, we could save
    these as a blob sequence instead.
-   **mesh:** Each of the three summaries for a mesh (the vertex summary, the
    face summary, and the color summary) has its tensor data independently
    encoded as raw bytes (packed f32/u32/u8 arrays) or `TensorProto` equivalent,
    and saved as a blob sequence.
-   **graphs:** The data on disk here is actually a bit different, as graphs
    don’t always use tensor summaries at all. Model graphs are traditionally
    stored on the top-level `graph_def` field of the `Event` proto. This should
    be converted into a length-1 blob sequence with a fixed tag name (say,
    `__run_graph__`) and manufactured summary metadata to indicate its
    provenance. Keras conceptual graphs and profiling data are represented as
    summaries with tag names, and so should be embedded into length-1 blob
    sequences with appropriate contents. To avoid name collisions with the fixed
    `__run_graph__` tag name, these should be name-scoped by kind: a
    user-provided tag `my_keras_model` should become
    `__model_graph__/my_keras_model`. (That is, the tag name encodes a
    discriminated union.)
-   **hparams:** Could be ingested as a blob sequence or tensor (all the data is
    actually in the tag name and summary metadata; the tensor content is empty).
    But we really want hparams to be some special run-level metadata rather than
    summaries, so maybe we hold off on doing anything for now.

\* We could also opt to drop the dimensions here, as the frontend doesn’t
actually need them, but (a) [we may want to use them later][image-dims], and (b)
this would basically be an orthogonal change. If the Storzy blobstore is
content-addressed, the extra storage is effectively free, as each “dimension”
file will only be stored once across all users. If it’s a unique-owner store,
we’re creating 67% more files per standard 3-sample summary, though the actual
file content bytes are of course negligible. Bandwidth costs at runtime should
be zero in any case, because the Python plugin just won’t call read_blob on
these two elements.

[audio-labels]: https://github.com/tensorflow/tensorboard/blob/a0c1def1e3a3725909f9fd59ee5d50fda81bb7ea/tensorboard/plugins/audio/summary_v2.py#L21
[audio-labels-request]: https://github.com/tensorflow/tensorboard/issues/296#issuecomment-320146370
[histo-shape]: https://github.com/tensorflow/tensorboard/blob/a0c1def1e3a3725909f9fd59ee5d50fda81bb7ea/tensorboard/plugins/histogram/summary.py#L17-L25
[image-dims]: https://github.com/tensorflow/tensorboard/pull/3009#pullrequestreview-329605910
[pr-curves-shape]: https://github.com/tensorflow/tensorboard/blob/4ee9ae8a31524131eb56f7a1dc4aa09d7d186f10/tensorboard/plugins/pr_curve/summary.py#L523-L532

## Mechanism structure

We propose a declarative mechanism by which each summary on disk declares its
appropriate data class.

The `SummaryMetadata` proto will gain a new field `DataClass` of enum type,
which may be “unknown” (default), “scalar”, “tensor”, or “blob sequence”. All
newly written data must set this field to be compatible with data providers. A
read-time compat layer will transform known first-party plugin data into this
new form, analogous to the existing `data_compat.py` layer that transparently
migrates v1-style summaries to v2-style summaries.

### Protocol buffer changes

In `summary.proto`, add a new enumerated type:

```proto
enum DataClass {
    DATA_CLASS_UNKNOWN = 0;
    DATA_CLASS_SCALAR = 1;
    DATA_CLASS_TENSOR = 2;
    DATA_CLASS_BLOB_SEQUENCE = 3;
}
```

Then, extend the existing `SummaryMetadata` to include a field of this type:

```proto
message SummaryMetadata {  // (extend)
    DataClass data_class = 4;
}
```

The value of `data_class` on a tag’s summary metadata, whether explicitly set or
implicitly zero, establishes constraints on the tensor values for all `Value`s
of the same time series:

-   A value of `DATA_CLASS_UNKNOWN` is the implicit default, and corresponding
    data will be entirely skipped by data provider APIs, including the
    TensorBoard.dev uploader and the local version of TensorBoard running in
    generic data mode.
-   For `DATA_CLASS_SCALAR`, the time series must contain only rank-0 tensors of
    floating point dtype, which will be upcast to f64 and interpreted as
    scalars.
-   For `DATA_CLASS_TENSOR`, the time series shape and dtype are unconstrained,
    but the total size must be bounded above by a moderate constant (e.g.,
    10&nbsp;MiB), and implementations may warn or fail if the size exceeds
    implementation-defined limits.
-   For `DATA_CLASS_BLOB_SEQUENCE`, the time series must contain only rank-1
    bytestring tensors, which are converted into blob sequences in the evident
    manner.

These semantics are consistent with the multiplexer’s treatment of scalars and
tensors, so the scalars, histograms, and distributions dashboards will work
unchanged.

If a time series contains tensors that do not satisfy the constraints of its
data class, the behavior is implementation-defined. Implementations should warn
the user; additionally, they might drop the rest of the time series, drop the
whole time series, or error out entirely. Similarly, this data format is only
supported for tensor summaries, not legacy summaries (`simple_value`, etc.).
That is, the v1-to-v2 `data_compat` transformation is assumed to have been
effected.

This is a proto change, so it requires changes to TensorFlow code. We can
prototype with changes only to the TensorBoard compat protos, but we have a
policy that we don’t perform a PyPI release unless
[our protos are in sync with TensorFlow’s][proto-test], so we’d have to be
careful there.

[proto-test]: https://github.com/tensorflow/tensorboard/blob/ca4d6408caea7f8b823acc25266a7226349d1a67/tensorboard/compat/proto/BUILD#L51-L52

### Compat layer

A new private module `tensorboard.dataclass_compat` exposes a function
`migrate_event`, which takes a `tensorboard.Event` proto and returns a sequence
of `tensorboard.Event` protos to be used instead.

This transformation is enabled unconditionally, so its output should be backward
compatible. For instance, an event with `graph_def` set should yield an output
summary with blob sequence data class, but should also yield the original
`graph_def` event so that the graph dashboard continues to work when generic
data mode is disabled.

This general approach of a transparent read-time transformation has worked quite
well for us in the past. The `tensorboard.data_compat` module has (objectively)
needed little maintenance and (subjectively) not significantly complicated
mental models or increased cognitive load.

Summary transformations for scalars, histograms, images, text, and PR curves can
just set the `SummaryMetadata.data_class` field without additional
transformation, which will work in both worlds (generic data and direct
multiplexer). Audio summary transformations will need to be different in the two
worlds, so we should do one of the following:

-   Emit both the old forms and the new forms with different
    `AudioPluginData.version` values (or similar). Let the old backend code
    ignore future versions and the new backend code ignore.
-   Emit just the new forms and atomically backport support for this format to
    the non-generic data branch of the audio plugin.
-   Emit just the new forms, enable generic data in the audio plugin by default,
    and just delete the old codepaths.

The latter is an appealing option. Now that `is_active` works properly with data
providers (as of [PR&nbsp;#3124][pr-3124]), this is probably the way to go.

One clear way to stage this would be to first change the on-disk form of audio
summaries to one that *can* be trivially embedded into the data classes
paradigm, as a separate change meeting the normal backward compatibility
guarantees, and then simply perform the trivial embedding. In other words, make
the hard change easy, then make the easy change.

[pr-3124]: https://github.com/tensorflow/tensorboard/pull/3124

### Wiring

The `plugin_event_accumulator.EventAccumulator` will be modified to call into
`dataclass_compat` when processing events. This change will take effect
immediately for all users of local TensorBoard. This change can be a no-op for
the non-generic read paths, as they don’t need to inspect the new field on
`SummaryMetadata`. The multiplexer-backed data provider will only return data
whose declared data class matches the request: e.g., a `list_scalars` call for a
given plugin will only list time series with `DATA_CLASS_TENSOR`.

Once TensorBoard.dev has a storage system ready, we’ll make a similar change to
the uploader. The uploader will need to case on the `SummaryMetadata.data_class`
field to determine what RPCs to send to the remote server. The upload pipeline
currently does not use the multiplexer at all, and that can continue to be the
case.

## Alternatives considered

### Plugin-provided transformation code

Instead of augmenting summaries to declare their data classes at write time, we
could ask plugins to provide code that classifies summaries at read time. A
plugin would declare two functions, like:

-   `ingest_time_series`: Takes tag name and summary metadata. Returns a
    sequence of `Coproduct[ScalarTimeSeries, TensorTimeSeries,
    BlobSequenceTimeSeries]` or moral equivalent: we need the name and metadata,
    but not max step or wall time. We don’t fold this into `ingest_value` below
    because it only makes sense for the summary metadata processing to happen
    once.
-   `ingest_value`: Takes tag name and `plugin_event_accumulator.TensorEvent` or
    moral equivalent. Returns sequence of `(output_tag_name, datum)`, where
    `datum` is a `ScalarDatum`, `TensorDatum`, or something like
    `BlobSequenceDatum` except that the values are actual bytestrings (or
    callables returning bytestrings, maybe) rather than just keys.

With this approach, plugin authors have wide flexibility to design
transformations, and first- and third-party plugins are on essentially the same
playing field when it comes to migrating legacy data. These are both nice to
have, but this approach has some disadvantages.

Fundamentally, this is a “code-oriented” approach, whereas the the write-time
transformation is a “data-oriented” approach. The code-oriented approach couples
the interpretation of data to particular Python APIs and to Python itself; it’s
already true that more of the core summary logic lives in Python than we’d like.
This approach means that to load data from a third-party plugin into your
database, you need to execute arbitrary code written by that plugin author,
which is a security concern that doesn’t exist when summaries simply declare
their data class. With Python in particular, we’re also concerned about certain
places where this API might force unnecessary copies, which matters for a key
data loading pipeline: TensorBoard’s data load speed is a real user-facing
issue. This approach would also further entrench the notion that data is *owned*
by a plugin rather than simply *being* of a certain format (like a MIME type),
as each type of data would need to have one canonical set of ingestion
semantics. All in all, we favor the declarative approach of self-describing data
over introducing arbitrary imperative read-time transformations.

### More complex transformations

If we ignore for a moment the constraints of data already saved to disk and
consider instead only the most “natural” forms for each plugin’s kind of data,
we might come to some different conclusions. For instance, instead of
representing a mesh as three separate summaries for vertices, faces, and colors,
it might make more sense to store a single blob encoded as more domain-specific
format like Wavefront OBJ or Stanford PLY.

It’s worth considering such transformations to see how they inform APIs that we
might want to expose. For instance, this mesh transformation would require a
mapping mechanism that allows combining multiple input time series into one
output time series. Given that the various components of the input could in
principle be read long after each other, this seems like a significant
constraint, and this single use case is not compelling enough to merit support.

While in principle we could use this occasion to make such “unrelated” changes
to data representation, it’s probably best to stage those changes separately, if
at all.

### Dataclass-aware data provider

Some of this work could potentially be avoided by creating a new implementation
of the data provider interface for local TensorBoard that’s *not* backed by the
existing multiplexer infrastructure. It could be “dataclass-aware” from the
beginning. Its in-memory storage could be more closely aligned with the generic
data ontology, with separate collections for “scalars”, “tensors”, and “blob
sequences”, perhaps also separated by plugin name. This could potentially be
more efficient at read time. It could have better downsampling strategies. It
could avoid reading large blobs into memory eagerly, instead storing byte
offsets into events files and seeking into them when actually requested, which
could make loading faster, relieve memory pressure, and enable us to downsample
less aggressively by default. It would also be easier to read this new data
provider as a “reference implementation” for heavier-weight providers backed by
real databases.

A downside is that this requires frontloading additional work: a whole new data
provider to replace the existing reservoir, accumulator, and multiplexer code.
The existing code clocks in at around 3000 lines, and some of this is useful
functionality that would likely be dropped in a first-pass rewrite: proper
support for directory deletions; detecting and adjusting for out-of-order and
orphaned data; multithreaded loading. Losing that “polish” functionality makes
it harder to aggressively flip all users over to the new data provider, which in
turn increases its risk.

We should certainly remain open to creating a natively dataclass-aware provider,
as it has real potential benefits. But we needn’t couple that to this work. We
can implement it once the data provider APIs have settled a bit and we’ve
learned more from them, and we can gate it behind its own independent feature
flag. And we can fix the concurrency bugs and cruft in the multiplexer without
throwing away the code entirely. :-)

## References

-   [TensorBoard generic data APIs and implementations][data-apis]

## Changelog

-   **2020-01-08:** Added “Dataclass-aware data provider” alternative.
    Simplified suggested migration path contingent on enabling generic data mode
    by default.
-   **2020-01-02:** Initial version for public comment.
