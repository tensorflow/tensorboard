# The Precision-Recall Curve Dashboard

This dashboard displays precision-recall curves over time (across steps). PR
curves help clarify the [tradeoff between precision and recall](https://en.wikipedia.org/wiki/Precision_and_recall)
when comparing models.

Each curve corresponds to one binary classification problem. Hence, users with
multi-class outputs should generate 1 curve per class.

![The PR Curves Dashboard](images/pr_curves_intro.png)

## Collecting Data for the Dashboard

Chose the method of data collection that suits the use case. As with other
plugins, these methods are documented in the `summary` module of the plugin
directory.

### `pr_curve_streaming_op`
Perhaps the most prevalent way of collecting data during TensorFlow runs is via
the `pr_curve_streaming_op` method. This streaming op accumulates true/false
positive and true/false negative counts across batches.

Here is a trivial example of its use.

```python
from tensorboard import summary as summary_lib
import tensorflow as tf

labels = tf.constant([False, True, True, False, True], dtype=tf.bool)
predictions = tf.random_uniform(labels.get_shape(), maxval=1.0)
_, update_op = summary_lib.pr_curve_streaming_op(name='foo',
                                                 predictions=predictions,
                                                 labels=labels,
                                                 num_thresholds=11)
merged_summary = tf.summary.merge_all()

with tf.Session() as sess:
  writer = tf.summary.FileWriter('/tmp/logdir', sess.graph)
  sess.run(tf.local_variables_initializer())
  for step in xrange(43):
    sess.run([update_op])
    if step % 6 == 0:
      writer.add_summary(sess.run(merged_summary), global_step=step)
```

`tflearn` users can make a `MetricSpec` with the `pr_curve_streaming_op` method:

```python
from tensorboard import summary as summary_lib
...
def _create_metric(metric_fn):
  """Wrapper method that makes a metric out of the PR curve streaming op."""
  def metric(predictions, labels, weights=None):
    """A metric for a binary classification problem.

    Args:
      predictions: A float32 tensor.
      labels: A tensor castable to boolean. Has the same shape as `predictions`.
      weights: An optional float32 tensor. Broadcastable to `predictions`.

    Returns:
      A metric value that conforms to tflearn's API.
    """
    # The streaming op accepts boolean labels, so we cast.
    labels = tf.cast(labels, tf.bool)
    return metric_fn(predictions=predictions, labels=labels, weights=weights)
  return metric

tf.contrib.learn.MetricSpec(
    metric_fn=_create_metric(
        functools.partial(
            summary_lib.pr_curve_streaming_op,
            name='foo')),
    prediction_key=tf.contrib.learn.PredictionKey.CLASSES),
```

### `pr_curve_raw_data_op`

Sometimes, a project computes precision-recall data using custom logic and would
like to merely visualize that data within TensorBoard (instead of computing
precision-recall data with this plugin's logic).

The `pr_curve_raw_data_op` method accepts a `num_thresholds` int as well as 6
rank-1 tensors (of size `num_thresholds`):

1. true_positive_counts
2. false_positive_counts
3. true_negative_counts
4. false_negative_counts
5. precision
6. recall

The values within each tensor should correspond to threshold values (spanning 0
to 1) that increase from left to right.

As shown below, one effective use case is writing the output of the
`tf.contrib.metrics.precision_recall_at_equal_thresholds` streaming metric to
disk. The run and space time of this metric scales linearly with the size of the
predictions tensor (unlike `pr_curve_streaming_op`, which scales quadratically).
Hence, for instance, use cases that assign a prediction per pixel in a big image
may prefer using `precision_recall_at_equal_thresholds`.

The `precision_recall_at_equal_thresholds` metric also lets users further make
use of precision-recall data to compute other values such as an
[F<sub>1</sub> score](https://en.wikipedia.org/wiki/F1_score).

```python
from tensorboard import summary as summary_lib
import tensorflow as tf

labels = tf.constant([False, True, True, False, True], dtype=tf.bool)
predictions = tf.random_uniform(labels.get_shape(), maxval=1.0)
num_thresholds = 11

# `data` is a `PrecisionRecallData` named tuple, which contains several ops for
# precision-recall related data (precision, recall, TP, FP, TN, FN).
data, update_op = tf.contrib.metrics.precision_recall_at_equal_thresholds(
    name='foo',
    predictions=predictions,
    labels=labels,
    num_thresholds=num_thresholds)

# Write the data to disk for visualization within the PR curve dashboard.
summary_lib.pr_curve_raw_data_op(
    name='foo',
    true_positive_counts=data.tp,
    false_positive_counts=data.fp,
    true_negative_counts=data.tn,
    false_negative_counts=data.fn,
    precision=data.precision,
    recall=data.recall,
    num_thresholds=num_thresholds,
    display_name='foo (really some random data)',
    description='Predictions are generated from a uniform distribution.')

# We can also compute metrics such as F1 max to be shown in the scalar
# dashboard.
summary_lib.scalar(
    'f1_max',
    tf.reduce_max(
        2.0 * data.precision * data.recall / tf.maximum(
            data.precision + data.recall, 1e-7)))

merged_summary = tf.summary.merge_all()

with tf.Session() as sess:
  writer = tf.summary.FileWriter('/tmp/logdir', sess.graph)
  sess.run(tf.local_variables_initializer())
  for step in xrange(43):
    sess.run([update_op])
    if step % 6 == 0:
      writer.add_summary(sess.run(merged_summary), global_step=step)
```

### `pr_curve_raw_data_pb`

The `pr_curve_raw_data_pb` method is an analog of `pr_curve_raw_data_op` that
may be used outside of a TensorFlow environment to collect precision-recall
data. `pr_curve_raw_data_pb` accepts the analogous lists or numpy arrays.

This method directly returns a `tf.Summary` proto.

```python
from tensorboard import summary as summary_lib

summary_proto = summary_lib.pr_curve_raw_data_pb(
    name='foo'
    true_positive_counts=[75, 64, 21, 5, 0]
    false_positive_counts=[150, 105, 18, 0, 0]
    true_negative_counts=[0, 45, 132, 150, 150]
    false_negative_counts=[0, 11, 54, 70, 75]
    precision=[0.3333333, 0.3786982, 0.5384616, 1.0, 0.0]
    recall=[1.0, 0.8533334, 0.28, 0.0666667, 0.0]
    num_thresholds=5
    display_name='some raw values'
    description='We passed raw values into a summary op.')
```

### `pr_curve`

This TensorFlow op computes precision-recall data for a single step. Unlike
`pr_curve_streaming_op`, the `pr_curve` op does not aggregate across steps. This
is often not useful because TensorFlow evaluation accumulates data obtained from
several steps.

However, it is useful when a user really seeks PR data for a single step.

```python
from tensorboard import summary as summary_lib
import tensorflow as tf

labels = tf.constant([False, True, True, False, True], dtype=tf.bool)
predictions = tf.random_uniform(labels.get_shape(), maxval=1.0)
summary_lib.pr_curve(name='foo',
                     predictions=predictions,
                     labels=labels,
                     num_thresholds=11)
merged_summary = tf.summary.merge_all()

with tf.Session() as sess:
  writer = tf.summary.FileWriter('/tmp/logdir', sess.graph)
  for step in xrange(43):
    writer.add_summary(sess.run(merged_summary), global_step=step)
```

### `pr_curve_pb`

This method is an analog of the `pr_curve` op that may be used outside of a
TensorFlow environment. It takes list or numpy arrays as inputs for the
`predictions`, `labels`, and `weights` inputs. The op then computes precision
and recall.

This method directly returns a `tf.Summary` proto.

```python
from tensorboard import summary as summary_lib

labels = [False, True, True, False, True]
predictions = [0.2, 0.4, 0.5, 0.6, 0.8]
summary_proto = summary_lib.pr_curve_pb(
    name='foo',
    predictions=predictions,
    labels=labels,
    num_thresholds=11)
```

## The Dashboard UI

### The Sidebar

Users can change the step at which to view PR curves via a step selector. Users
can specify different steps for each run.

Only runs with precision-recall data have step selectors. As with some other
plugins, users can toggle runs with the run selector.

![The Sidebar](images/sidebar.png)

### Filtering Charts

Users can filter visualizations via inputting a regular expression for desired
tags.

![Tag Filter](images/tag_filter.png)

### Chart Interactions

Drag and form a rectangle within a chart to zoom in.

The buttons beneath a chart respectively let users

1. expand a chart to fill the whole width.
2. reset to the default scale (to undo all zooms).

Hovering over the icon on the top right reveals the description.

![A single PR Curve Chart](images/single_chart.png)

#### Tooltips

Users can trace their pointers across a chart to make a tooltip appear. For each
run, the tooltip reveals the threshold, precision, recall, true positive count,
false positive count, true negative count, and false negative count at the
current position.

![Tooltip](images/tooltip.png)
