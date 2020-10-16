# Line chart library

This is a generic charting library with a focus on performance.

### Design goals

- Agnostic to HTMLCanvas vs. OffscreenCanvas
- Generic to different implementation of renderer; SVG vs. WebGL.
- Minimize cache eviction and try to do a minimal work for render

### Jargons we define

- coordinatior: A utility module for converting coordinate systems. Abstracts
  away certain renderer quirks and holds onto state, helping with performance
  optimizations.
- renderer: a stateful module that knows how to render limited number of
  primitives such as line, rect, circle, and text (for more accurate set of
  supported shapes, please refer to the abstract class) using a defined
  technology. For instance, there can be a SVG, canvas, and threejs renderer.
  As a consumer of the renderer, you do not have to keep track of what was
  rendered in a previous render cycle but only focus on what should be rendered
  in the current render cycle; renderer will remove what should disappear
  appropriately.
