# TensorBored - Developer Agent Guidelines

This document is for AI agents (and human developers) working **on the TensorBored codebase itself**. It covers project structure, architecture, state management, build system, CI/CD, and patterns you need to follow when making changes.

If you want to learn how to **use** TensorBored as an end-user or integrate it into a training pipeline, see [AGENTS_DOC.md](./AGENTS_DOC.md) instead.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Relationship to TensorBoard](#relationship-to-tensorboard)
- [Frontend Architecture](#frontend-architecture)
  - [NgRx State Management](#ngrx-state-management)
  - [Key State Slices](#key-state-slices)
  - [Component Patterns](#component-patterns)
  - [Key Feature Files](#key-feature-files)
- [Backend Architecture](#backend-architecture)
  - [Plugin System](#plugin-system)
  - [Profile Writer](#profile-writer)
  - [Color Sampler](#color-sampler)
  - [Core Plugin Endpoints](#core-plugin-endpoints)
- [localStorage Persistence](#localstorage-persistence)
- [Build System](#build-system)
- [Testing](#testing)
- [CI/CD Workflows](#cicd-workflows)
- [Common Development Tasks](#common-development-tasks)
- [Coding Guidelines](#coding-guidelines)
- [Feature History and Context](#feature-history-and-context)
- [Open Issues and Future Work](#open-issues-and-future-work)
- [Debugging Tips](#debugging-tips)

---

## Project Overview

TensorBored is a fork of [TensorBoard](https://github.com/tensorflow/tensorboard) with enhanced features for PyTorch workflows. The fork is kept in sync with upstream via a daily GitHub Actions workflow (`upstream-sync.yml`). The package is renamed from `tensorboard` to `tensorbored` throughout — Python imports, Bazel targets, proto packages, entry points, and CLI commands all use the `tensorbored` name. A `tensorboard` CLI alias is retained for backwards compatibility.

The key features added on top of TensorBoard are:

| Feature                              | Issue | PR(s)                   |
| ------------------------------------ | ----- | ----------------------- |
| Stable/programmatic run colors       | #1    | #12                     |
| Upstream sync bot                    | #2    | #10                     |
| Log/symlog x-axis scales             | #3    | #8                      |
| Superimposed plots                   | #4    | #9, #19                 |
| Dashboard profiles (localStorage)    | #5    | #12                     |
| CI wheel builds                      | #6    | #7, #11, #15            |
| Metric descriptions                  | #20   | #23                     |
| Pinned card reordering               | #21   | #22                     |
| Shift-select runs                    | #25   | —                       |
| PR preview deployments               | —     | #24                     |
| HuggingFace Spaces demo              | —     | #16, #27, #28, #29, #30 |
| Default axis scales in profiles      | #32   | —                       |
| Configurable symlog linear threshold | #34   | —                       |

---

## Repository Structure

```
/workspace/
├── tensorbored/                  # Main source code (renamed from tensorboard/)
│   ├── webapp/                   # Angular frontend (TypeScript, NgRx)
│   │   ├── metrics/              # Metrics dashboard
│   │   │   ├── actions/          # NgRx actions (metricsTagFilterChanged, etc.)
│   │   │   ├── store/            # Reducers, selectors, types
│   │   │   ├── effects/          # Side effects (API calls, localStorage)
│   │   │   └── views/            # UI components
│   │   │       ├── card_renderer/  # Individual card components
│   │   │       │   ├── scalar_card_*          # Scalar chart cards
│   │   │       │   ├── histogram_card_*       # Histogram cards
│   │   │       │   ├── image_card_*           # Image cards
│   │   │       │   └── superimposed_card_*    # Superimposed (multi-tag) cards
│   │   │       └── main_view/    # Dashboard layout, filter input
│   │   ├── runs/                 # Run selection and management
│   │   │   └── store/            # Run state, colors, selection
│   │   ├── profile/              # Dashboard profiles feature [NEW]
│   │   │   ├── types.ts          # ProfileData, SerializedProfile interfaces
│   │   │   ├── data_source/      # localStorage + backend API
│   │   │   ├── store/            # Profile NgRx state
│   │   │   ├── effects/          # Profile load/save/apply effects
│   │   │   └── views/            # Profile menu UI
│   │   ├── header/               # Top navigation bar
│   │   ├── core/                 # Core state and actions
│   │   └── widgets/              # Reusable UI components
│   │       └── line_chart_v2/    # Line chart (includes SYMLOG10 scale)
│   ├── plugins/                  # Backend plugins (Python)
│   │   ├── core/                 # Core plugin
│   │   │   ├── core_plugin.py    # /data/profile endpoint
│   │   │   ├── profile_writer.py # Python API for writing profiles [NEW]
│   │   │   └── color_sampler.py  # OKLCH color sampling [NEW]
│   │   ├── scalar/               # Scalar data plugin
│   │   ├── metrics/              # Metrics plugin (serves tag descriptions)
│   │   └── ...                   # histogram, image, text, projector, etc.
│   ├── backend/                  # WSGI backend server
│   ├── pip_package/              # Package build scripts
│   ├── compat/proto/             # Protobuf definitions
│   └── main.py                   # Entry point (run_main)
├── .github/workflows/            # CI/CD workflows
│   ├── ci.yml                    # Build, test, lint, wheel, PR preview
│   ├── wheel-prerelease.yml      # RC wheel → PyPI → demo deploy
│   ├── deploy-demo.yml           # HuggingFace Spaces deployment
│   ├── pr-preview.yml            # PR preview spaces (part of ci.yml)
│   ├── nightly-release.yml       # Nightly wheel builds
│   └── upstream-sync.yml         # Daily sync from tensorflow/tensorboard
├── demo/                         # Demo for HuggingFace Spaces
│   ├── generate_demo_data.py     # Synthetic training data generator
│   ├── Dockerfile                # Docker image for demo deployment
│   └── start.sh                  # Startup script
├── pyproject.toml                # Package metadata, entry points
├── AGENTS_DEV.md                 # This file (developer guide)
├── AGENTS_DOC.md                 # User/integration guide
├── RELEASE.md                    # Release process notes
└── docs/                         # Documentation, notebooks
```

---

## Relationship to TensorBoard

TensorBored was forked from `tensorflow/tensorboard` and the entire codebase was renamed:

- Python package: `tensorboard` → `tensorbored`
- Bazel workspace: `org_tensorflow_tensorboard` → `org_tensorbored`
- Proto packages: `tensorboard.*` → `tensorbored.*`
- CLI: both `tensorboard` and `tensorbored` work (entry points in `pyproject.toml`)

An automated upstream sync workflow runs daily at 06:00 UTC. If there are merge conflicts, it creates a GitHub issue with the `upstream-sync` label for manual resolution.

When working on the codebase, be aware that most upstream TensorBoard code still exists. TensorBored additions live in clearly scoped areas (the `profile/` directory, `profile_writer.py`, `color_sampler.py`, superimposed card components, etc.).

---

## Frontend Architecture

### NgRx State Management

The frontend uses Angular with NgRx for state management. The pattern is:

1. **Actions** — Events that trigger state changes (e.g., `metricsTagFilterChanged`, `superimposedCardCreated`, `profileSaved`)
2. **Reducers** — Pure functions that update state in response to actions
3. **Selectors** — Memoized functions that derive data from state
4. **Effects** — Side effects like API calls, localStorage reads/writes, and cross-slice coordination

### Key State Slices

| Slice     | Location                | Contents                                                                               |
| --------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `metrics` | `webapp/metrics/store/` | Card data, pinned cards, superimposed cards, tag filter, smoothing, x/y scale settings |
| `runs`    | `webapp/runs/store/`    | Run metadata, selection state (visible/hidden), color overrides, group colors          |
| `profile` | `webapp/profile/store/` | Available profiles, active profile, unsaved changes flag                               |

### Component Patterns

- **Container components** — Connect to the NgRx store, dispatch actions, select state. Named `*Container`.
- **Presentation components** — Pure UI with `@Input()` / `@Output()`. Named `*Component`.
- All components use `ChangeDetectionStrategy.OnPush` for performance.
- Superimposed cards use `JSON.stringify` to combine tag and runId in the `runId` field passed to the line chart, preventing issues with special characters in tags.

### Key Feature Files

| Feature                    | Key Files                                                                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Superimposed cards**     | `webapp/metrics/views/card_renderer/superimposed_card_container.ts`, `superimposed_card_component.ts`, `superimposed_card_component.ng.html`                                |
| **Superimposed state**     | `webapp/metrics/store/metrics_reducers.ts` (actions: `superimposedCardCreated`, `superimposedCardTagAdded`, `superimposedCardTagRemoved`, `superimposedCardDeleted`)        |
| **Pinned cards**           | `webapp/metrics/store/metrics_reducers.ts` (pin/unpin reducers, reorder action `metricsPinnedCardsReordered`)                                                               |
| **Pinned card reorder UI** | `webapp/metrics/views/main_view/` (CDK Drag&Drop, arrow buttons on card headers)                                                                                            |
| **Run selection**          | `webapp/runs/store/runs_reducers.ts` (single toggle, range toggle, page toggle)                                                                                             |
| **Shift-select runs**      | `webapp/runs/views/runs_table/runs_data_table.ts` (`selectionClick` with shift key, `lastClickedIndex`), `webapp/runs/actions/runs_actions.ts` (`runRangeSelectionToggled`) |
| **Run colors**             | `webapp/runs/store/runs_reducers.ts` (hash-based fallback, profile overrides)                                                                                               |
| **Profile system**         | `webapp/profile/` directory (types, data_source, store, effects, views)                                                                                                     |
| **Profile menu**           | `webapp/profile/views/profile_menu_component.ts` (mat-icon-button, bookmark icon, unsaved dot indicator)                                                                    |
| **Tag filter**             | `webapp/metrics/views/main_view/filter_input_*`                                                                                                                             |
| **Tag filter persistence** | `webapp/metrics/effects/index.ts` (`persistTagFilter$`, `loadTagFilterFromStorage$`)                                                                                        |
| **Scale types**            | `webapp/widgets/line_chart_v2/lib/scale.ts` (LINEAR, LOG10, SYMLOG10 with configurable linearThreshold), `webapp/widgets/line_chart_v2/lib/scale_types.ts`                  |
| **Axis scales**            | `webapp/metrics/store/metrics_types.ts` (yAxisScale, xAxisScale in MetricsSettings), `webapp/profile/types.ts` (AxisScaleName, conversion utils)                            |
| **Legacy symlog**          | `components/vz_line_chart2/symlog-scale.ts` (Plottable-based `SymLogScale`)                                                                                                 |
| **Metric descriptions**    | `webapp/metrics/views/utils.ts` (`htmlToText`, `buildTagTooltip`), card components fetch `tagDescription`                                                                   |
| **Card scale cycling**     | Scalar cards and superimposed cards cycle `LINEAR → LOG10 → SYMLOG10 → LINEAR` on click for both X and Y axes (X-axis only for STEP/RELATIVE)                               |

---

## Backend Architecture

### Plugin System

Each backend plugin provides:

- Data loading from tfevents files
- HTTP endpoints consumed by the frontend
- (Optionally) summary writing utilities

Plugins are registered via entry points in `pyproject.toml` or discovered by the plugin loader.

### Profile Writer

**Location:** `tensorbored/plugins/core/profile_writer.py`

Python API for training scripts to configure default dashboard profiles. Writes `<logdir>/.tensorboard/default_profile.json`.

Key functions:

- `create_profile(...)` — builds a profile dict
- `write_profile(logdir, profile)` — writes to disk
- `set_default_profile(logdir, ...)` — convenience: create + write in one call
- `pin_scalar(tag)`, `pin_histogram(tag, run_id)`, `pin_image(tag, run_id, sample)` — helpers for pinned card entries
- `create_superimposed_card(title, tags, run_id)` — helper for superimposed card entries

Profile data schema version is tracked via `PROFILE_VERSION = 1`.

### Color Sampler

**Location:** `tensorbored/plugins/core/color_sampler.py`

Generates perceptually uniform colors using the OKLCH color space (OKLCH → OKLAB → Linear sRGB → sRGB → Hex).

Key API:

- `sample_colors(n, lightness, chroma, hue_start, hue_range)` — n evenly-spaced colors
- `sample_colors_varied(n)` — varied lightness/chroma for >8 colors
- `ColorMap(n)` — callable class: `cm(i)` returns the i-th color
- `colors_for_runs(run_ids)` — auto-assigns colors to a list of run IDs
- `palette_categorical(n)`, `palette_sequential(n, hue)`, `palette_diverging(n)` — preset palettes
- `lighten(hex, amount)`, `darken(hex, amount)` — color utilities

### Core Plugin Endpoints

The core plugin (`core_plugin.py`) exposes a `/data/profile` endpoint:

- **GET**: Returns the default profile JSON from `<logdir>/.tensorboard/default_profile.json`
- The frontend fetches this on navigation and auto-applies it (if present and no user profile is active)

The metrics plugin (`metrics_plugin.py`) merges `metric_descriptions` from the default profile into the `/data/tags` response, converting Markdown descriptions to safe HTML.

---

## localStorage Persistence

The frontend persists state to browser localStorage. This is the core mechanism for TensorBored's "persistent settings" feature.

| Key                    | Purpose                       | Format                                                             | Persisted By    |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------ | --------------- |
| `_tb_profile.*`        | Saved profile data            | JSON `ProfileData`                                                 | Profile effects |
| `_tb_profiles_index`   | List of profile names         | JSON string array                                                  | Profile effects |
| `_tb_active_profile`   | Currently active profile name | Plain string                                                       | Profile effects |
| `_tb_run_selection.v1` | Run visibility states         | `{version: 1, runSelection: [[id, bool], ...]}`                    | Runs effects    |
| `_tb_run_colors.v1`    | Color overrides               | `{version: 1, runColorOverrides: [...], groupKeyToColorId: [...]}` | Runs effects    |
| `_tb_tag_filter.v1`    | Tag filter regex              | `{value: string, timestamp: number}`                               | Metrics effects |
| `_tb_axis_scales.v1`   | Axis scales                   | `{version: 1, yAxisScale?: string, xAxisScale?: string}`           | Metrics effects |
| `tb-saved-pins`        | Pinned cards                  | JSON `CardUniqueInfo[]`                                            | Metrics effects |

Important behaviors:

- When loading run selection from localStorage, if **all** runs would be hidden, the selection is discarded and all runs default to visible.
- Tag filter persistence uses timestamps: user-set values override profile defaults.
- Pins are synced to localStorage both when saving profiles and when pinning/unpinning cards directly.
- Profiles can come from two sources: `LOCAL` (user-created in browser) or `BACKEND` (from `default_profile.json`). Backend profiles do not overwrite existing user state if a local profile is already active.

---

## Build System

TensorBored uses **Bazel** for builds and tests.

```bash
# Build the development server
bazel build //tensorbored/webapp:devserver

# Build the pip package
bazel build //tensorbored/pip_package:pip_package

# Build everything
bazel build //tensorbored/...
```

The pip package is also described by `pyproject.toml` for metadata, but the actual build uses Bazel via `pip_package/build_pip_package.sh`.

---

## Testing

### Running Tests

```bash
# All tests
bazel test //tensorbored/...

# Frontend tests only
bazel test //tensorbored/webapp/...

# Specific test target
bazel test //tensorbored/webapp/runs/store:runs_reducers_test
bazel test //tensorbored/webapp/metrics/store:metrics_reducers_test
bazel test //tensorbored/webapp/profile/store:profile_reducers_test

# Backend tests
bazel test //tensorbored/plugins/...
```

### Test Patterns

- Unit tests are colocated with source files: `foo.ts` has `foo_test.ts`
- Use `fakeAsync` / `tick()` for async Angular tests
- Override selectors with `store.overrideSelector(selectorFn, mockValue)`
- For floating-point comparisons (e.g., SYMLOG10 scale), use `toBeCloseTo` instead of `toEqual`
- Mock `TBHttpClient` for HTTP tests (not `HttpClientTestingModule`, due to Bazel visibility)
- Test `CardUniqueInfo` objects must include `plugin` and `tag` fields (not just scalar tags)

---

## CI/CD Workflows

| Workflow         | File                   | Trigger                    | Purpose                                                           |
| ---------------- | ---------------------- | -------------------------- | ----------------------------------------------------------------- |
| CI               | `ci.yml`               | Push, PR                   | Build, test, lint, build wheel (master only), PR preview deploy   |
| Wheel Prerelease | `wheel-prerelease.yml` | Push to master             | Build RC wheel, publish to PyPI, trigger demo deploy              |
| Deploy Demo      | `deploy-demo.yml`      | Called by wheel-prerelease | Deploy to HuggingFace Spaces (`demonstrandum-tensorbored-sample`) |
| PR Preview       | Part of `ci.yml`       | PR open/sync               | Deploy PR preview to `Demonstrandum/tensorbored-pr-{N}` HF Space  |
| Nightly Release  | `nightly-release.yml`  | Scheduled                  | Nightly wheel build                                               |
| Upstream Sync    | `upstream-sync.yml`    | Daily 06:00 UTC            | Merge latest changes from `tensorflow/tensorboard`                |

Key CI details:

- Wheel artifacts are named `tensorbored-wheel_py*` (not `tensorbored-nightly_py*`)
- The HF Spaces deploy uses a `.build-version` file to bust Docker layer caches
- PR preview spaces are auto-deleted when the PR is closed/merged
- The CI waits for HF Space builds and fails if the space enters `BUILD_ERROR` / `RUNTIME_ERROR` / `CONFIG_ERROR`
- PR preview comments are updated with build status

---

## Common Development Tasks

### Adding a New Setting to Metrics

1. Add the field to `MetricsState` in `webapp/metrics/store/metrics_types.ts`
2. Add the initial value in `webapp/metrics/store/metrics_reducers.ts`
3. Create an action in `webapp/metrics/actions/index.ts`
4. Add a reducer case in `webapp/metrics/store/metrics_reducers.ts`
5. Add a selector in `webapp/metrics/store/metrics_selectors.ts`
6. Wire up in the relevant component (container dispatches action, presentation uses input)

### Adding localStorage Persistence for a Setting

1. Define a storage key constant (e.g., `_tb_my_setting.v1`)
2. Create a **load effect** that triggers on `navigated` and reads from localStorage
3. Create a **persist effect** that triggers on the relevant action(s) and writes to localStorage
4. Add the effect to the module's `EffectsModule.forFeature([...])` registration
5. If the effect is non-dispatching, add `{dispatch: false}` to `createEffect()`

### Modifying the Profile Schema

1. Update `ProfileData` interface in `webapp/profile/types.ts`
2. Update `createEmptyProfile()` to include the new field's default value
3. Update `isValidProfile()` to validate the new field
4. If the change is breaking: bump `PROFILE_VERSION` and add migration logic in `migrateProfile()`
5. Update `profile_writer.py` (`create_profile` function) to accept the new field
6. Update `profile_effects.ts` to apply the new field when activating a profile

### Adding a New Superimposed Card Feature

1. Update `SuperimposedCardMetadata` in `webapp/metrics/types.ts` if new fields are needed
2. Add/modify actions in `webapp/metrics/actions/index.ts`
3. Update reducers in `webapp/metrics/store/metrics_reducers.ts`
4. Update `SuperimposedCardContainer` and `SuperimposedCardComponent` in `webapp/metrics/views/card_renderer/`
5. If the feature should be profile-saveable, update `ProfileData` and profile effects

### Adding a New Backend Plugin Feature

1. Implement the endpoint in the appropriate plugin (e.g., `core_plugin.py`)
2. Register the route in the plugin's `get_plugin_apps()` method
3. Add corresponding frontend data source / API call
4. Wire up to NgRx effects for async data loading

---

## Coding Guidelines

1. **Avoid branching in hot loops** — Select specialized functions once per run. Pick the function/implementation once outside the loop.
2. **Prefer dataclasses over dicts** — Use typed structures (dataclasses, TypedDict, interfaces) over ad-hoc dicts, especially for data passed around core codepaths.
3. **Use int/enum comparisons** — Not string comparisons in performance-sensitive paths.
4. **No constant conditionals in loops** — If a branch is trivially determined beforehand, decide it once outside the loop.
5. **Avoid defensive programming** — No unnecessary try/except fallbacks. Don't wrap every attribute access in layers of fallback when you know the structure.
6. **Follow existing patterns** — TensorBored additions follow the same NgRx patterns as the rest of the codebase. Container/Presentation split, `OnPush` change detection, memoized selectors.
7. **Formatting** — Python: Black (line-length 80, target py38/py39). TypeScript/HTML/CSS: Prettier. Bazel BUILD files: Buildifier. Run formatting before committing.

---

## Feature History and Context

This section provides context on _why_ features were built the way they were, based on the issue and PR history.

### Stable Run Colors (#1)

TensorBoard assigned random colors to runs, which changed on every page refresh. TensorBored computes colors deterministically from a hash of the run ID/name, so the same run always gets the same color. Colors can also be overridden programmatically via the profile writer. When no explicit colors are set, the frontend uses hash-based fallback colors (never white/invisible). Color overrides are stored in localStorage (`_tb_run_colors.v1`).

### Dashboard Profiles (#5, #12)

The single biggest architectural addition. TensorBoard stored all dashboard state in URL parameters, hitting browser URL length limits with many pins. TensorBored moved everything to localStorage-based profiles:

- Save/load/delete/export/import profiles
- Backend can provide a `default_profile.json` that auto-applies on first load
- Profiles store: pinned cards, run colors, group colors, superimposed cards, run selection, tag filter, smoothing, groupBy, metric descriptions
- The profile menu uses a bookmark icon button with an orange dot for unsaved changes
- Multiple race conditions were fixed: session flags prevent duplicate application, localStorage is checked for active profile before applying backend defaults, pins are merged (not replaced) when loading profiles

### Superimposed Plots (#4, #9, #19)

Users wanted to compare metrics on a single chart. The implementation adds a new card type (`SuperimposedCard`) to the existing card system:

- State: `SuperimposedCardId`, `SuperimposedCardMetadata` with ordered tag lists
- Scalar cards have "Add to superimposed plot" in their overflow menu with a submenu to create new or add to existing
- Titles auto-update as `tag1 + tag2 + ...`
- Superimposed cards support the same scale cycling (LINEAR/LOG10/SYMLOG10) as regular scalar cards
- Pan/zoom is wired up via viewBox
- Cards are persisted in profiles and localStorage

### Log/Symlog Scales (#3, #8, #34)

Added `SYMLOG10` to the `ScaleType` enum. The symmetric log scale uses the log-modulus transformation: `sign(x) * log10(|x|/c + 1)`, where `c` is the **linear threshold** parameter. This handles zero and negative values gracefully. Both X and Y axes cycle `LINEAR → LOG10 → SYMLOG10`. X-axis scale is only available for STEP and RELATIVE axis types (not WALL_TIME). A legacy Plottable-based `SymLogScale` was also added for `vz_line_chart2`.

The linear threshold `c` (default 1) controls where the scale transitions from linear to logarithmic behavior:

- `c = 1`: linear for |x| < 1 (default, original behavior)
- `c = 10`: linear for |x| < 10 (good for data with large values near zero)
- `c = 0.01`: linear for |x| < 0.01 (good for very small-scale data)

The threshold is configurable via the Settings pane under "Scalars → Symlog Linear Threshold" and is persisted in profiles and backend settings. The Python `profile_writer` also accepts `symlog_linear_threshold` when creating profiles.

### Pinned Card Reordering (#21, #22)

Uses Angular CDK Drag&Drop on pinned cards. Left/right arrow buttons provide keyboard-friendly reordering. `cdkDragHandle` is set on card headers to avoid conflicting with plot interactions (zoom). The new order is persisted when "Save Pinned Cards" is enabled.

### Metric Descriptions (#20, #23)

Long-form descriptions for metrics, set via `metric_descriptions` in the profile writer. The backend reads descriptions from the default profile and merges them into the `/data/tags` endpoint response as HTML (Markdown → safe HTML conversion). The frontend shows descriptions as tooltips on card headers (scalars, histograms, images). A `buildTagTooltip` utility formats `tag — description` text. An `htmlToText` utility strips HTML for tooltip display.

### Shift-Select Runs (#25)

Users wanted to select a whole range of runs at once using the classic shift+click start+end shortcut. The implementation adds shift-click range selection to the runs data table:

- A `lastClickedIndex` is tracked in `RunsDataTable` as component state. Normal clicks set the anchor index and emit the existing single-toggle event.
- Shift+click computes the range `[min(anchor, clicked), max(anchor, clicked)]`, collects all run IDs in that range from the displayed `data` array, and emits a new `onRangeSelectionToggle` event with the run IDs and target selected state (toggled from the clicked run's current state).
- A new NgRx action `runRangeSelectionToggled({runIds, selected})` sets all specified runs to the given state.
- The action is included in the `persistRunSelection$` effect so range selections are saved to localStorage.

### Tag Filter Persistence (#26)

The tag filter regex is persisted to localStorage (`_tb_tag_filter.v1`) with a timestamp. When a profile is activated, the system checks if the user has explicitly set a filter (by comparing timestamps); user-set values take priority over profile defaults. Clearing the filter explicitly is also persisted (empty string is a valid user choice).

### Default Run Selection (#26)

When loading a profile, runs not explicitly listed in `runSelection` default to visible (not hidden). If a localStorage run selection would result in all runs being hidden, it is discarded and all runs become visible. This prevents the "blank dashboard" problem.

### Axis Scales in Profiles (#32)

Profiles can specify Y-axis and X-axis scale types for scalar plots via `yAxisScale` and `xAxisScale` fields. Valid values are `"linear"`, `"log10"`, and `"symlog10"`. The feature has three persistence layers:

1. **Backend profiles** (`profile_writer.py`): Set `y_axis_scale="log10"` in `create_profile()` or `set_default_profile()`. The frontend reads this from the backend's default profile JSON.
2. **Local profiles**: When saving a profile in the UI, the current axis scales are included. Only non-LINEAR scales are stored (to keep the JSON minimal).
3. **localStorage** (`_tb_axis_scales.v1`): When the user changes the axis scale, it's persisted to localStorage. On reload, the stored scales are restored.

In scalar card and superimposed card components, the profile's scale is applied as the initial value. Once the user manually toggles the scale on a specific card (cycling LINEAR → LOG10 → SYMLOG10), that card's `yScaleUserSet`/`xScaleUserSet` flag is set to `true`, preventing the profile value from overriding the user's choice. X-axis scale settings only apply to STEP and RELATIVE axis types (not WALL_TIME).

---

## Open Issues and Future Work

| Issue | Status      | Description                                                                            |
| ----- | ----------- | -------------------------------------------------------------------------------------- |
| #25   | Implemented | Shift-select runs to toggle a range (shift+click to select a contiguous range of runs) |

---

## Debugging Tips

### State Inspection

Install the Redux DevTools browser extension to inspect NgRx state in real time. The state tree shows `metrics`, `runs`, and `profile` slices.

### Network Issues

Check the browser DevTools Network tab. TensorBored should only make requests to `localhost`. The `/data/profile` endpoint returns the backend default profile; `/data/tags` includes metric descriptions.

### Empty Charts

If charts appear blank:

1. Check if time series data exists in state (Redux DevTools → `metrics` slice)
2. Verify run selection — are runs set to visible? (`runs` slice → `selectionState`)
3. Check card visibility — intersection observer may not have triggered
4. Look for console errors
5. For superimposed cards: verify the `loadSuperimposedTimeSeries$` effect fired

### Profile Not Loading

1. Check localStorage in DevTools → Application → Local Storage
2. Look for `_tb_active_profile` — is it set?
3. Check the `_tb_profile.<name>` key — is the JSON valid?
4. Check for `default_profile.json` in the logdir's `.tensorboard/` directory
5. Look for migration issues in the browser console
6. Check if a session flag is preventing duplicate application (refresh may help)

### Superimposed Cards Not Showing

1. Verify the superimposed card state in Redux DevTools (`metrics.superimposedCards`)
2. Check that the `loadSuperimposedTimeSeries$` effect is fetching data for the tags
3. Ensure `SuperimposedCardModule` is exported from `CardRendererModule`
4. Check that viewBox is wired up for pan/zoom in the template

### Run Colors Wrong or Missing

1. Check `_tb_run_colors.v1` in localStorage
2. Verify the profile's `runColors` array entries have valid `runId` and `color` fields
3. If colors are white/invisible, the hash-based fallback may not be working — check the color computation in runs store
