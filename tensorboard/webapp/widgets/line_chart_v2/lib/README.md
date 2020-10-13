# Line chart library

This is a generic charting library with a focus on performance.

### Design goals

- Agnostic to HTMLCanvas vs. OffscreenCanvas
- Generic to different implementation of renderer; SVG vs. WebGL.
- Minimize cache eviction and try to do a minimal work for render

### Jargons we define

- layout: a rectangular structure inside a chart that can have width and height.
- drawable: a layout that draws content
- data drawable: a drawable (and transitively a layout) that renders data of a chart.
