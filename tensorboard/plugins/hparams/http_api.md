# HParams plugin HTTP API
HParams backend supports calling requests with both HTTP POST and GET.
Each method below has an associated 'request' protocol buffer and returns
a 'response' protocol buffer. The 'request' is expected to be encoded in JSON
format and the response will be returned encoded in JSON format. Encoding protos
to JSON format is described
[here](https://developers.google.com/protocol-buffers/docs/proto3#json)).

For POST the request is expected to be passed in the request body. For GET the
request is expected to be passed (properly escaped) in a URL query parameter
named 'request'.

### Notes:
1. Per TensorBoard's conventions, each end-point has a "data/plugin/hparams"
prefix. This prefix can be configured to other values, if required.

2. Currently, a single TensorBoard UI window supports only one
experiment, but the API below accepts an experiment name required to support
multiple experiments in the future. It is up to the API server backing the
2. Although a single TensorBoard UI window currently supports only one
experiment, the API below accepts an experiment name required to support
multiple experiments in the future. It is up to the API server backing the
plugin to respect the experiment name.

## `/data/plugin/hparams/experiment`
Returns the Experiment object defining the metadata for the experiment.
### Args:
>A GetExperimentRequest object.

## `/data/plugin/hparams/session_groups`
Lists the session groups in the experiment.
### Args:
>A ListSessionGroupsRequest object.

### Returns:
>A ListSessionGroupsResponse object.

## `/data/plugin/hparams/metric_evals`

### Args:
>A ListMetricEvalsRequest object.

### Returns:
>An array consisting of evaluations of the given metric in the given session.
> Each element in the array is itself
>a 3-element array of the form [wall_time, step, value], where:
>'wall_time' represents the time in which the evaluation took place,
>represented as seconds since the UNIX epoch, 'step' is the training step
>in which the evaluation took place, and value is the (scalar floating
>point) evaluation of the metric.
>The array is encoded in the response in JSON.
>Note: We use this format, rather than define a more structured response
>message to be compatible with the way the 'Scalars' plugin expects metric
>evaluation data.

