# RustBoard: technical design

@wchargin, 2020-10-29

**Status:** Shipped in TensorBoard 2.5.0.

## Purpose

The goal of RustBoard is to improve TensorBoard data loading performance by
order-of 100×, while providing a better developer experience and opportunity for
growth and experimentation. The purpose of this document is to provide a
high-level overview of its architecture, for collaborators.

## Architecture

Picture first:

<figure>

![Data flow diagram with four logical blocks: browser, `tensorboard(1)` process,
`rustboard(1)` sidecar process, and event files on disk. In the TensorBoard
process: data flows from a web server thread to the browser. The web server gets
data from plugins (scalars plugin, text plugin, images plugin), which get data
from the data provider API, one implementation of which is the gRPC data
provider. This talks over a TCP socket on `localhost` to get data from the
RustBoard process, starting with the gRPC server thread. The RustBoard gRPC
server gets data from a “commit” in shared memory. Separate run loader threads
periodically push new data to the commit, as they read from the event files on
disk][data-flow-diagram]

  <figcaption>
    Data flow diagram. Solid arrows are responses; dashed arrows are push updates.
  </figcaption>

</figure>

[data-flow-diagram]: images/rustboard_data_flow.svg

When TensorBoard receives an HTTP request for data, it issues queries against a
*[data provider]* to fetch that data. The data provider API has multiple
implementations: local TensorBoard uses a data provider that reads from event
files, TensorBoard.dev reads from a Cloud Spanner database, and Google-internal
data providers read from other data stores. The read path for local TensorBoard
is very slow, due to a combination of in-Python data structure manipulation and
overhead due to C++ marshalling and locking. To do better, we introduce
RustBoard: a new data provider for local TensorBoard that also reads from event
files, but more efficiently. By switching to the new data provider, TensorBoard
can seamlessly benefit from the performance improvements, without changing the
Python application structure, and with no observable changes at the plugin
layer.

[data provider]: ./generic_data_apis.md

For simplicity, the core loading code of RustBoard will run in a separate
process (written, as the name implies, in Rust). RustBoard communicates with the
TensorBoard data provider over a gRPC connection on a localhost TCP socket. The
TCP and RPC overheads are small compared to the cost of actually loading the
data from disk. If desired, this could be refactored into a cPython extension
module that runs in-process and shares memory directly. But that is more
complicated to write, to build, and to deploy, so we defer such a change.

The performance goals of RustBoard are, in order:

1.  Maximize data loading throughput.
2.  Minimize RPC latency.
3.  Maximize RPC throughput.

Data loading throughput is most important because it is the limiting factor
between the time that the user launches TensorBoard and the time that they can
see their most recent training data. Most TensorBoard RPCs and HTTP requests are
fairly small, since they only operate on downsampled data, so they tend to
naturally be “fast enough”. The vast majority of data read is either discarded
immediately or evicted from the reservoir later, so getting past this data as
quickly as possible is key. The best way to do that is to do as little as
possible per byte read.

Internally, RustBoard centers around the **commit**, a value in memory shared
among the RPC serving threads and the data loading threads. The commit holds
enough information to serve all data provider requests. Each run loader will
periodically update its portion of the commit. These updates are batched to
reduce lock contention. Each run loader also owns a local **stage**, which it
has exclusive access to. As a run loader reads data from event files, it updates
its stage with the pending changes: no synchronization required. If the stage
grows large, or if some threshold of time has passed, the stage is published to
the shared commit.

Each run loads its event files sequentially, for consistency. Separate runs are
loaded in parallel under a simple reload loop. First, the log directory is
scanned for event files, and the set of runs identified. Second, a thread pool
starts to load each run and blocks until completion. Third, the loading process
sleeps for a fixed delay (5 seconds, by default). Finally, the process repeats.

We now discuss the design of the commit and stage data structures described
above.

## Commit

The commit should be concurrently readable by many serving threads, and a
loading thread should be able to update its portion of the commit without
blocking access to the rest of it. Thus, the commit has a hierarchical structure
of read-write locks:

```rust
struct Commit {
    runs: RwLock<HashMap<RunName, RwLock<RunData>>>,
}
struct RunData {
    start_time: Option<WallTime>,
    scalars: HashMap<TagName, TimeSeries<ScalarValue>>,
    tensors: HashMap<TagName, TimeSeries<TensorValue>>,
    blob_sequences: HashMap<TagName, TimeSeries<BlobSequenceValue>>,
}
struct TimeSeries<V> {
    metadata: proto::SummaryMetadata,
    values: Vec<(Step, WallTime, Result<V, DataLoss>)>,
}
struct DataLoss;
```

(The `DataLoss` variant is used when a point that makes it into the commit is
not valid: e.g., a point in a scalar time series whose tensor has `DT_STRING`.
These are elided from responses, but kept in the reservoir for implementation
simplicity, to avoid having to retroactively evict them and deal with the
effects on the sampling control.)

Recall that with a shared reference to a read-write lock, you can obtain either
a shared (read) or exclusive (write) reference to the guarded value. Then
consider the different operations:

-   Adding or removing runs. In each load cycle in which runs are added or
    removed, the logdir loader grabs an exclusive reference to the runs map, and
    inserts empty RunData for new runs and deletes entries for deleted runs.
    This global contention is fine because it only happens once per load cycle
    in which runs are added or removed.

-   Updating data. When a run loader commits its stage, it grabs a shared
    reference to the runs map and an exclusive reference to its own RunData
    value. Then, it batch-updates the metadata and values, inserting new entries
    if necessary. Because only a shared reference to the runs map is needed,
    requests to other runs may proceed concurrently, and other run loaders may
    commit concurrently as well.

-   Reading data. A reader grabs a shared reference to the runs map and then a
    shared reference to one or more RunData values. Uncontended unless updates
    are being committed.

This leads to two important observations. First, when TensorBoard is loading
data but not serving requests, the process is entirely uncontended on those few
locks that it acquires. Second, in the event of contention, most critical
sections are fine-grained, not globally locking.

As a tweak, we could wrap each `TimeSeries<_>` with a `RwLock`. This would mean
that run loaders could update a time series even while requests read other time
series for the same run. But that would significantly increase the amount of
locking (by a factor of “average tags per run”), so it’s not obviously an
improvement.

## Stage

Next, we discuss the structure of the stage owned exclusively by a run loader:

```rust
struct StageReservoir<T> {
    committed_steps: Vec<Step>,
    staged_items: Vec<(Step, T)>,
    // internal state: capacity, records seen, RNG state, ...
}
struct Stage(HashMap<TagName, StageTimeSeries>);
struct StageTimeSeries {
    next_commit: Instant,
    metadata: proto::SummaryMetadata,
    rsv: StageReservoir<StageValue>,
}
// `StageValue` type discussed later
```

A stage reservoir is a bipartite data structure for reservoir sampling. Each
record in the reservoir is either committed or staged. For committed records, we
retain only the step (an `i64`, which is small); for staged records, we retain
the step and the record itself. Together, `committed_steps` and `staged_items`
represent the reservoir contents: their combined size is bounded by the
reservoir capacity, items are evicted uniformly at random from their union, etc.

The values actually staged in the reservoir are as close to the source format as
possible:

```rust
struct StageValue {
    wall_time: f64,
    payload: StagePayload,
}
enum StagePayload {
    GraphDef(Vec<u8>),
    SummaryValue {
        metadata: Option<proto::SummaryMetadata>,
        value: proto::summary::value::Value,  // the oneof Summary.Value.value field
    },
}
```

This minimizes the amount of work done for items that are not included in the
reservoir or that are evicted before the next commit. Data-compat
transformations are effected only when the values are actually committed.

When a record is offered to the reservoir, it is added to the end of
`staged_items` (since we always retain the most recent record), evicting either
the most recent record or a random earlier record. When the stage is committed,
record values—the second components of the `(Step, T)` pairs—are moved into the
commit, and steps are moved into `committed_steps`. After a commit operation,
`staged_items` is empty.

## Code location

The code for RustBoard lives in `//tensorboard/data/server`. The above type
definitions are meant to be illustrative, and may diverge from the exact
implementations.

## Changelog

-   **2020-11-06:** Changed commit structure from “four `RwLock`ed maps from run
    name” to “single `RwLock`ed map from run name to struct of four items”.
-   **2020-10-29:** Initial version.
