# The Profile Plugin Dashboard


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

###1. Device Side Table
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

###2. Host Side Table
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





