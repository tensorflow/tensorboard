# Image plugin HTTP API

The image plugin name is `images`, so all its routes are under
`/data/plugin/images`.

## `/data/plugin/images/tags`

Retrieves an index of tags containing image data.

The result is a dictionary mapping from `runName` (quoted string) to
dictionaries that map a `tagName` (quoted string) to an object
containing that tag’s `displayName` (a short string), `description` (a
string containing sanitized HTML to be rendered into the DOM), and
`samples` (an integer indicating how many samples of the relevant image
tag are available). Here is an example:

    {
      "train_run": {
        "input_reshaped": {
          "displayName": "Input",
          "description": "<p>The input images, reshaped to 28&times;28&thinsp;px.</p>",
          "samples": 3
        },
      }
      "eval": {
        "generated_result": {
          "displayName": "Input",
          "description": "<p>The result of the GAN. Each sample <em>i</em> is intended to be an image of the digit <em>i</i>.</p>",
          "samples": 10
        },
        "attribution": {
          "displayName": "Attribution heatmap",
          "description": "<p>A heatmap of which pixels in the image were most important.</p>",
          samples: 3
        }
      }
    }

For each tag, `samples` is the greatest number of images that appear at
any particular step. For example, if for tag `input_reshaped` there are
five samples at step 0 and ten samples at step 1, then the dictionary
for `"input_reshaped"` will contain `"samples": 10`.

Note that runs without any image tags are included as keys with value
the empty object.

## `/data/plugin/images/images?run=foo&tag=bar&sample=baz`

Fetch metadata about the images for the particular run, tag, and
zero-indexed sample. The result is a list of image events, each one of
which is an object with the following items:

  - `"wall_time"`: floating-point number of seconds since epoch.
  - `"step"`: integer step counter.
  - `"width"`: integer width of the image, in pixels.
  - `"height"`: integer height of the image, in pixels.
  - `"query"`: query string that can be given to the `individualImage`
    route (below) to serve the actual image content. This string must be
    treated as opaque: clients must not inspect or modify its value.

Here is an example response:

    [{
      "width": 28,
      "height": 28,
      "wall_time": 1440210599.246,
      "step": 63702821,
      "query": "index=0&sample=0&tagname=input%2Fimage%2F2&run=train"
    }, {
      ...
    }]


## `/data/plugin/images/individualImage?<query>`

Serve raw image data for a particular image. The query string should be
the result of a previous request to the `images` route: see
documentation above.

For instance, a request to this route might look like

    /data/plugin/images/individualImage?index=0&sample=0&tagname=input%2Fimage%2F2&run=train

As noted above, the `<query>` must be treated as opaque: clients must
not inspect or modify it.

In typical usage, the `src` of an `<img>` element can be set to point to
this route.

A typical response has `Content-Type: image/png` and contains raw PNG
data in its body.

Note that the query is not guaranteed to always refer to the same image even
within a single run, as images may be removed from the sampling reservoir and
replaced with other images. (See the main [README] for details on the
reservoir sampling.)

[README]: https://github.com/tensorflow/tensorboard/blob/master/README.md
