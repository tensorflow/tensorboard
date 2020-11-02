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
