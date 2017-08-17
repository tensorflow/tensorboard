# Audio plugin HTTP API

The audio plugin name is `audio`, so all its routes are under
`/data/plugin/audio`.

## `/data/plugin/audio/tags`

Retrieves an index of tags containing audio data.

The result is a dictionary mapping from `runName` (quoted string) to
dictionaries that map a `tagName` (quoted string) to an object
containing that tag’s `displayName` (a short string), `description` (a
string containing sanitized HTML to be rendered into the DOM), and
`samples` (an integer indicating how many samples of the relevant audio
tag are available). Here is an example:

    {
      "train": {
        "input": {
          "displayName": "Input",
          "description": "<p>Input speech from a human.</p>",
          "samples": 3
        },
      }
      "eval": {
        "generated_result": {
          "displayName": "Output",
          "description": "<p>A sample of results from the GAN.</p>",
          "samples": 10
        },
      }
    }

For each tag, `samples` is the greatest number of audio clips that
appear at any particular step. For example, if for tag `input_reshaped`
there are five clips at step 0 and ten clips at step 1, then the
dictionary for `"input_reshaped"` will contain `"samples": 10`. (This
usage of `samples` is not related to actual sample data in the
waveforms.)

Note that runs without any audio tags are included as keys with value
the empty object.

## `/data/plugin/audio/audio?run=foo&tag=bar&sample=baz`

Fetch metadata about the audio for the particular run, tag, and
zero-indexed sample. The result is a list of audio events, each one of
which is an object with the following items:

  - `"wall_time"`: A floating-point number of seconds since epoch.
  - `"step"`: A integer step counter.
  - `"label"`: A string containing sanitized HTML that describes this
    particular sample.
  - `"contentType"`: The MIME type for the audio clip at this sample.
    This can be used to set the `type` attribute of an HTML `<audio>`
    element, for example.
  - `"query"`: A query string that can be given to the `individualAudio`
    route (below) to serve the actual audio content. This string must be
    treated as opaque: clients must not inspect or modify its value.

Here is an example response:

    [{
      "wall_time": 1440210599.246,
      "step": 63702821,
      "contentType": "audio/wav",
      "query": "index=0&sample=0&tagname=input&run=train"
    }, {
      ...
    }]


## `/data/plugin/audio/individualAudio?<query>`

Serve raw audio data for a particular audio clip. The query string
should be the result of a previous request to the `audio` route: see
documentation above.

For instance, a request to this route might look like

    /data/plugin/audio/individualAudio?index=0&sample=0&tagname=input&run=train

As noted above, the `<query>` must be treated as opaque: clients must
not inspect or modify it.

In typical usage, the `src` of an `<audio>` element can be set to point
to this route.

Note that the query is not guaranteed to always refer to the same audio
clip even within a single run, as clips may be removed from the sampling
reservoir and replaced with other clips. (See the main [README] for
details on the reservoir sampling.)

[README]: https://github.com/tensorflow/tensorboard/blob/master/README.md
