# Text plugin HTTP API

The text plugin name is `text`, so all its routes are under
`/data/plugin/text`.

## `/data/plugin/text/tags`

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

## `/data/plugin/text/text?run=foo&tag=bar`

Returns an array of text events for the given run and tag.  Each event is
a dictionary with members `step`, `text`, and `wall_time`, where `wall_time` is
a floating-point number of seconds since epoch, `step` is an integer step
counter, and `text` is the actual HTML for rendering the text data
on the frontend.

Example:

```json
  {
    "step": 4,
    "text": "<table>↵<tbody>↵<tr>↵<td><p>....</p></td>↵</tr>↵</tbody>↵</table>",
    "wall_time": 1591289315.827554
  }
```
