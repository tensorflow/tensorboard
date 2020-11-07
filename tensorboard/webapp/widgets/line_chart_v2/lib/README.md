# Line chart library

This is a generic charting library with a focus on performance.

### Design goals

- Agnostic to HTMLCanvas vs. OffscreenCanvas
- Generic to different implementation of renderer; SVG vs. WebGL.
- Do a minimal work; for example, it should only do a coordinate system conversion upon
  requested and it should do the minimal operation on rendered object.

### Key concepts

- coordinatior: A utility module for converting coordinate systems. Abstracts
  away certain renderer quirks and holds onto state, helping with performance
  optimizations.
- renderer: A pure module responsible for shape rendering (e.g., line, rect, triangle,
  etc...) of a given technology such as SVG or Three.js.
- data drawable: a view that draws renders data in a reigon given. Examples of data
  drawable are series line and bar drawers. As implementer of a new visualizer should
  subclass DataDrawable and implement a `redraw` method. The base class maintains both
  data and render caches and let visualizer focus on the `redraw` method.
- paint brush: primitives, such as `setLine`, for a data drawable that should be used
  inside a `redraw` method.
