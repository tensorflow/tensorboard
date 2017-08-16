# Graph plugin HTTP API

The graph plugin name is `graphs`, so all its routes are under
`/data/plugin/graphs`.

## `/data/plugin/graphs/runs`

Returns a list of runs that have associated graphs.

For example:

    ["train"]

## `/data/plugin/graphs/graph?run=foo&limit_attr_size=1024&large_attrs_key=key`

Returns the graph definition for the given run in pbtxt format. The
graph is composed of a list of nodes, where each node is a specific
TensorFlow operation which takes as inputs other nodes (operations).

The query parameters `limit_attr_size` and `large_attrs_key` are
optional, and function as follows:

  - `limit_attr_size` specifies the maximum allowed size in bytes,
    before the attribute is considered large and filtered out of the
    graph. If specified, it must be a positive integer. If not
    specified, no filtering is applied.

  - `large_attrs_key` is the attribute key that will be used for storing
    attributes that are too large. The value of this key (a list of
    strings) should be used by the client in order to determine which
    attributes have been filtered. This must be specified if
    `limit_attr_size` is specified.

For instance, for the query

    /data/plugin/graphs/graph?run=foo&limit_attr_size=1024&large_attrs_key=_too_large

there follows an example pbtxt response of a graph with 3 nodes, where
the second node had two large attributes "a" and "b" that were filtered
out (size > 1024):

    node {
      op: "Input"
      name: "A"
    }
    node {
      op: "Input"
      name: "B"
      attr {
        key: "small_attr"
        value: {
          s: "some string"
        }
      }
      attr {
        key: "_too_large"
        value {
          list {
            s: "a"
            s: "b"
          }
        }
      }
    }
    node {
      op: "MatMul"
      name: "C"
      input: "A"
      input: "B"
    }

Prior to filtering, the original node "B" had the following content:

    node {
      op: "Input"
      name: "B"
      attr {
        key: "small_attr"
        value: {
          s: "some string"
        }
      }
      attr {
        key: "a"
        value { Very large object... }
      }
      attr {
        key: "b"
        value { Very large object... }
      }
    }

## `/data/graphs/run_metadata_tags`

Retrieves an index of run metadata tags. The result is a dictionary that
maps each run name (a string) to a list of tag names (as strings).

Here is an example response:

    {
      "train": [
        "step_0000",
        "step_0100",
        "step_0200",
      ],
      "eval": [],
    }

Note that runs without any run metadata tags are included as keys with
value the empty array.

## `/data/run_metadata?run=foo&tag=bar`

Given a run and tag, returns the metadata of a particular
`Session.run()` as a gzipped, pbtxt-serialized [`RunMetadata` proto].
For example:

    step_stats {
      dev_stats {
        device: "/job:localhost/replica:0/task:0/cpu:0"
        node_stats {
          node_name: "_SOURCE"
          all_start_micros: 1458337695775395
          op_start_rel_micros: 11
          op_end_rel_micros: 12
          all_end_rel_micros: 38
          memory {
            allocator_name: "cpu"
          }
          timeline_label: "_SOURCE = NoOp()"
          scheduled_micros: 1458337695775363
        }
      }
    }

[`RunMetadata` proto]: (https://github.com/tensorflow/tensorflow/blob/master/tensorflow/core/protobuf/config.proto)
