# The Profile Plugin Dashboard
  The TensorBoard Profile Dashboard includes a suite of cloud TPU tools. These
  tools help you understand, debug and optimize TensorFlow programs to run on
  cloud TPUs.

## Prerequisites
  Before you can use the tools in Profile Dashboard, you must have access to
  google cloud TPUs. You also need to capture trace information while your model
  is running. 

## Trace Viewer
  Trace Viewer contains a timeline that shows various operations in your
  TensorFlow model that the TPUs and host machine executed over time. The
  Timeline pane contains the following elements:

  * A top bar, which contains various auxiliary controls.
  * A time axis, which shows time relative to the beginning of the trace.
  * Section and track labels. Each section contains multiple tracks and
  has a triangle on the left that you can click to expand and collapse the
  section. There is one section for every processing element in the system.
  Sections and tracks will be explained in more detail below.
  * A tool selector, which contains various tools for interacting with the
  Trace Viewer. Events. These show the time during which an operation was
  executed or the duration of meta-events, such as training steps.

## Op Profile
  Op Profile tool displays the performance statistics of [High Level Optimizer
  (HLO)](https://www.tensorflow.org/performance/xla) operations executed during
  the profiling period. Op Profile shows:

  * How your application uses the TPU. The TPU FLOPS utilization reported is
    defined as the measured number of floating point operations per second
    (FLOPS) over the peak FLOPS supported by the TPU.
  * The most time consuming operation.
  * Details of each op, including shape, XLA expression and padding.

## Input Pipeline Analyzer
  Input pipeline analyzer tries to answer two questions:

  * Is your model input bound?
  * If it is, why?

##JSON format for input pipeline analyzer:
  Input pipeline analyzer are ported from Google internal tools where
  google-chart is used extensively. The original consumer for this JSON format
  is [google.visualization.DataTable](https://developers.google.com/chart/interactive/docs/reference#DataTable).
  We are in a process to moving from google-chart to Plottable and other
  visualization tools provided by Tensorboard.
  JSON for input pipeline analyzer use two separate DataTables: the first entry
  contains stats for device side state; the second entry contains stats for
  host side state. Each DataTable is associated with some table properties and
  some tabular data.

##1. Device Side Table
1.1 Properties:

  * infeed_percent_average
  * infeed_percent_maximum
  * infeed_percent_minimum
  * infeed_percent_standard_deviation
  * steptime_ms_average
  * steptime_ms_maximum
  * steptime_ms_minimum
  * steptime_ms_standard_deviation
  * summary_color
  * summary_text

1.2 Tabular data: rows are training steps. column ids are defined below.

  * stepnum: string
  * noninfeedTimeMs: number
  * infeedTimeMs: number
  * tooltip: string (NOT USED)
  * infeedPercentAverage: number
  * infeedPercentMin: number
  * infeedPercentMax: number

##2. Host Side Table
2.1 Properties:

  * advanced_file_read_us
  * conclusion
  * demanded_file_read_us
  * enqueue_us
  * preprocessing_us

2.2 Tabular data: rows are input-pipeline related tensorflow ops. column
    ids are defined below.

  * opName: string
  * count: number
  * timeInMs: number
  * timeInPercent: number
  * selfTimeInMs: number
  * selfTimeInPercent: number
  * category: string
