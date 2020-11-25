# Text v2 plugin HTTP API

The text plugin name is `text_v2`, so all its routes are under
`/data/plugin/text_v2`.

## `/data/plugin/text_v2/tags`

Retrieves an index of tags containint text data.

Returns a dictionary mapping from `runName` (quoted string) to an
array of `tagName`. Here is an example:
```json
  {
    "text_demo_run": [
      "simple_example/greeting",
      "markdown_table/chocolate_study",
      "higher_order_tensors/multiplication_table"
    ]
  }
```
Runs without any text tags are omitted from the result.

## `/data/plugin/text_v2/text?run=foo&tag=bar`

Returns an array of text events for the given run and tag.  Each event is
a dictionary with members `wall_time`, `step`, `string_array`, `original_shape`, and `truncated`,
where `wall_time` is a floating-point number of seconds since epoch, `step` is
an integer step counter, `string_array` is an n-dimensional array, `original_shape` is the
size of each dimension in the tensor provided to the text-summarizer (Note this will
be different from the shape of `string_array` if truncation has occured), and
`truncated` is a boolean indicating whether the dimensionality of the array
was reduced (or truncated).

Example:
```json
  {
    "original_shape": [2, 2],
    "step": 1,
    "string_array": [["×", "**0**"], ["**0**", "0"]],
    "wall_time": 1591289315.824522,
    "truncated": false
  }
  ```
