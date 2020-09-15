# Metrics plugin HTTP API

This backend exposes summary data related to "metrics". This includes Scalar,
Histogram, Image data.


### Type `RunToTags`
Type: {[run: string]: string[]}

Map from run name to a list of tag names.

### Type `TagToDescription`
Type: {[tag: string]: string}

Map from tag name to a description string.

### Type `NonSampledTagMetadata`
Type: Object

Metadata for tags associated with a non-sampled type plugin.

Properties:
  - runTagInfo: RunToTags
  - tagDescriptions: TagToDescription

### Type `SampledTagMetadata`
Type: Object

Metadata for tags associated with a sampled type plugin.

Properties:
  - tagDescriptions: TagToDescription
  - tagRunSampledInfo: TagToRunSampledInfo

### Type `SampledTimeSeriesInfo`
Type: Object

Metadata associated with a time series generated from a sampled plugin.

Properties:
  - maxSamplesPerStep: number
    - The maximum datum count at any step in the time series. Note that the
      actual number of samples may differ at each step.

### Type `TagToRunSampledInfo`
Type: {[tag: string]: {[run: string]: SampledTimeSeriesInfo}}

Map from tag name to a map from run name to sampled time series info.

### Type `PluginType`
Type: string enum
  - SCALARS: 'scalars'
  - HISTOGRAMS: 'histograms'
  - IMAGES: 'images'

### Type `SingleRunPlugin`
Type: PluginType

Plugins of this type require a single run to be specified when requesting
time series data. Non-single-run plugins are not required to specify a run.

### Type `SampledPlugin`
Type: PluginType

Plugins of this type are associated with sampled time series. Sampled time
series may contain multiple samples of data at each step.

### Type `TagMetadata`
Type: Object

Properties:
  - `[PluginType.SCALARS]`: NonSampledTagMetadata
  - `[PluginType.HISTOGRAMS]`: NonSampledTagMetadata
  - `[PluginType.IMAGES]`: SampledTagMetadata

### Type `TimeSeriesRequest`
Type: Object

Request for time series data, which may correspond to at most one
TimeSeriesResponse in a successful case. Backends may handle requests
differently depending on the plugin, or ignore certain plugins completely.
In the future, this may be extended with options for filtering and sampling.

Properties:
  - plugin: PluginType
  - tag: string
  - run: optional string
    - The name of a requested run, required when plugin is a `SingleRunPlugin`.
  - sample: optional number
    - The zero-indexed sample, required when plugin is a `SampledPlugin`.

### Type `RunToSeries`
Type: {[run: string]: ScalarStepDatum[]}|
    {[run: string]: HistogramStepDatum[]}|
    {[run: string]: ImageStepDatum[]}

Map from run name to a list time series data sorted by step.

### Type `TimeSeriesSuccessfulResponse`
Type: Object

Response from the backend containing time series data for a TimeSeriesRequest.
The value of `plugin` determines the type of values in the `runToSeries` dict.
For example, if plugin is `scalars`, then series will be a list of
`ScalarStepDatum`.

Properties:
  - plugin: PluginType
  - tag: string
  - run: optional string
    - The name of a requested run, required when plugin is a `SingleRunPlugin`.
  - sample: optional number
    - The zero-indexed sample, required when plugin is a `SampledPlugin`.
  - runToSeries: RunToSeries

### Type `TimeSeriesFailedResponse`
Type: Object

Response from the backend for a TimeSeriesRequest that failed to get data.

Properties:
  - plugin: PluginType
  - tag: string
  - run: optional string
    - The name of a requested run, required when plugin is a `SingleRunPlugin`.
  - sample: optional number
    - The zero-indexed sample, required when plugin is a `SampledPlugin`.
  - error: string
    - The error reason.

### Type `TimeSeriesResponse`
Type: TimeSeriesSuccessfulResponse|TimeSeriesFailedResponse

Response from the backend containing time series data for a TimeSeriesRequest.

### Type `ScalarStepDatum`
Type: Object

Datum for a single step in a scalar time series.

Properties:
  - step: number
    - The global step at which this datum occurred; an integer. This is a unique
      key among data of this time series.
  - wallTime: number
    - The real-world time at which this datum occurred, as float seconds since
      epoch.
  - value: number
    - The scalar value for this datum; a float.

### Type `HistogramBin`
Type: Object

Single bin in a histogram, describing the number of items in a value range.

Properties
  - min: number
    - The smaller value of the bin's range.
  - max: number
    - The larger value of the bin's range.
  - count: number
    - The integer number of items in the bin.

### Type `HistogramStepDatum`
Type: Object

Datum for a single step in a histogram time series.

Properties:
  - step: number
    - The global step at which this datum occurred; an integer. This is a unique
      key among data of this time series.
  - wallTime: number
    - The real-world time at which this datum occurred, as float seconds since
      epoch.
  - bins: HistogramBin[]
    - The histogram contents, as a list of HistogramBins. Bins must be sorted
      by increasing 'min' value, and ranges must not overlap.

### Type `ImageStepDatum`
Type: Object

Datum for a single run+tag+sample+step in a image time series. This does not
contain actual image contents. See `ImageData` for contents of a single image.

Properties:
  - step: number
    - The global step at which this datum occurred; an integer. This is a unique
      key among data of this time series.
  - wallTime: number
    - The real-world time at which this datum occurred, as float seconds since
      epoch.
  - imageId: ImageId
    - A unique id for the image data.

### Type `ImageData`
Type: string

A bytestring of raw image bytes.

### Type `ImageId`
Type: string

A unique reference to identify a single image.

### Route `/data/plugin/timeseries/tags`

Returns tag metadata for a given experiment's logged metrics. Tag descriptions
may be produced by combining several descriptions for the same tag across
multiple runs.

Args:
  - experiment_id: optional string
    - ID of the request's experiment.

Returns:
  - TagMetadata

Example:

    Response:
    {
        "histograms": {
            "runTagInfo": {
                "test_run": ["ages"]
            },
            "tagDescriptions": {
                "ages": "<p>a distribution of Walrus ages</p>"
            },
        },
        "images": {
            "tagDescriptions": {
                "images/tagA": "<p>Initial digits</p>",
                "images/tagB": "<p>Reshaped digits</p>",
            },
            "tagRunSampledInfo": {
                "images/tagA": {
                    "run1": {"samples": 1}
                },
                "images/tagB": {
                    "run1": {"samples": 2},
                    "run2": {"samples": 3},
                },
            },
        },
        "scalars": {
            "runTagInfo": {"test_run": ["eval/population"]},
            "tagDescriptions": {
                "eval/population": "<p>the <em>most</em> valuable statistic</p>"
            },
        },
    }

### Route `/data/plugin/timeseries/timeSeries` (POST)

Responds to a list of requests for time series data. A list of requests may
cover multiple tags across multiple runs with different with data produced by
different plugins. Responses may be in any order.
Clients may wish to call this using tag names returned from a calling /tags.

Args:
  - experiment_id: string
    - string ID of the request's experiment.
  - requests: TimeSeriesRequest[]

Returns:
  - TimeSeriesResponse[]

Example:

    Arguments:
    {
      requests: [
        {"plugin": "scalars", "tag": "eval/population"},
        {"plugin": "histograms", "tag": "ages"},
        {"plugin": "images", "tag": "faces", "sample": 2},
      ]
    }

    Response:
    [
      {
        "plugin": "scalars"
        "tag": "eval/population"
        "runToSeries": {
          "run1": [
              {wallTime: 1550634693, step: 100, value: 7},
              {wallTime: 1550634899, step: 200, value: 8},
          ]
      },
      {
        "plugin": "histograms"
        "tag": "population"
        "runToSeries": {
          "run1": [
              {
                wallTime: 1550634693,
                step: 100,
                value: [[0, 0.5, 9], [1, 0.5, 10], [10, 0.5, 10], ...]},
          ]
      },
      {
        "plugin": "images"
        "tag": "faces"
        "sample": 2,
        "runToSeries": {
          "run1": [
            {wallTime: 1550634693, step: 100, imageId: "..."},
            {wallTime: 1550634899, step: 200, imageId: "..."},
          ],
        }
      },
    ]

### Route `/data/plugin/timeseries/imageData`

Returns an image's data. Instead of reading the raw data, clients may rely
on this endpoint URL as an HTMLImageElement's 'src' attribute.

Args:
  - imageId: ImageId

Returns:
  - Image data
