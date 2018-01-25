# Release 0.4.0

The 0.4 minor series tracks TensorFlow 1.4.

## Features

- PR Curve plugin has a full-featured new dashboard (#387, #426, many others)
- PR Curve plugin has new streaming and raw summary-writing ops (#520, #587)
- Graph plugin has a new "Functions" scene group to show function libraries and
  links to function calls (#394, #395, #497, #551, others)
- Graph plugin metanodes are now colored more helpfully (#467)
- Graph plugin selected run is now persisted to URL (#505)
- Standard dashboard card header UI is more compact and readable (#430)
- Pagination limit can now be configured in settings (#535)
- Text plugin now has op and pb summary writing methods (#510)
- Reduced boilerplate and cleaner API hooks for custom plugins (#611, #620)
- Faster initial loads due to improved active plugin detection (#621, #663)
- Reuse of TCP connections with switch to using HTTP/1.1 (#617)

## Bug fixes

- #477 - fixed URLs to properly URI-encode run and tag names
- #610 - fixed smoothing algorithm initial value bias - thanks @alexirpan
- #647 - fixed text plugin decoding error that led to bad markdown processing
