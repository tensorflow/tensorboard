# TensorBored - User & Integration Guide

TensorBored is a drop-in replacement for TensorBoard, focused on PyTorch workflows and an improved dashboard experience. It reads the same `tfevents` files, uses the same logdir structure, and provides all existing TensorBoard features plus several powerful additions.

This guide is for anyone who wants to **use** TensorBored — whether you are logging metrics from a training script, configuring dashboards, or building tools on top of it. You do not need to understand TensorBored's internal implementation to use this guide.

If you want to work **on the TensorBored codebase itself**, see [AGENTS_DEV.md](./AGENTS_DEV.md).

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Feature Overview](#feature-overview)
- [Dashboard Profiles](#dashboard-profiles)
  - [Using the Profile Menu](#using-the-profile-menu)
  - [Exporting and Importing Profiles](#exporting-and-importing-profiles)
  - [Setting Default Profiles from Python](#setting-default-profiles-from-python)
  - [Profile Data Schema](#profile-data-schema)
- [Superimposed Plots](#superimposed-plots)
  - [Creating Superimposed Plots in the UI](#creating-superimposed-plots-in-the-ui)
  - [Pre-configuring Superimposed Plots from Python](#pre-configuring-superimposed-plots-from-python)
- [Pinned Card Reordering](#pinned-card-reordering)
- [Metric Descriptions](#metric-descriptions)
- [Programmatic Run Colors](#programmatic-run-colors)
  - [Stable Hash-Based Colors](#stable-hash-based-colors)
  - [Setting Colors from Python](#setting-colors-from-python)
  - [The Color Sampler API](#the-color-sampler-api)
- [Log Scale and Symlog for Axes](#log-scale-and-symlog-for-axes)
- [Persistent Settings](#persistent-settings)
  - [Tag Filter Persistence](#tag-filter-persistence)
  - [Run Selection Persistence](#run-selection-persistence)
  - [Pin Persistence](#pin-persistence)
- [Default Run Selection](#default-run-selection)
- [Migration from TensorBoard](#migration-from-tensorboard)
- [Complete Python API Reference](#complete-python-api-reference)
  - [profile_writer](#profile_writer)
  - [color_sampler](#color_sampler)
- [Examples](#examples)
  - [Minimal Example](#minimal-example)
  - [Full Training Script Example](#full-training-script-example)
  - [Multi-Experiment Dashboard](#multi-experiment-dashboard)
- [Storage Architecture](#storage-architecture)
- [Live Demo](#live-demo)
- [FAQ](#faq)

---

## Installation

```bash
pip install tensorbored
```

TensorBored requires Python 3.9+.

---

## Quick Start

TensorBored works exactly like TensorBoard. Point it at a logdir:

```bash
# These are equivalent — both commands work
tensorbored --logdir ./logs
tensorboard --logdir ./logs
```

Then open `http://localhost:6006` in your browser.

If you are already using `torch.utils.tensorboard.SummaryWriter` or `tf.summary`, your existing code works without changes. TensorBored reads the same `tfevents` files.

For new PyTorch projects, we recommend importing the `SummaryWriter` directly from TensorBored:

```python
from tensorbored.torch import SummaryWriter
```

This is equivalent to `from torch.utils.tensorboard import SummaryWriter` but ensures the `tensorboard` module alias is active — no need to install the original `tensorboard` package separately.

To take advantage of the new features, you can optionally configure a dashboard profile from your training script:

```python
from tensorbored.plugins.core import profile_writer

profile_writer.set_default_profile(
    logdir='./logs',
    name='My Experiment',
    pinned_cards=[
        profile_writer.pin_scalar('train/loss'),
        profile_writer.pin_scalar('eval/accuracy'),
    ],
    smoothing=0.8,
)
```

When anyone opens TensorBored pointed at this logdir, they get your pre-configured view automatically.

---

## Feature Overview

| Feature | What It Does |
|---------|-------------|
| **Dashboard Profiles** | Save, load, export, import dashboard configurations. No more URL length limits. |
| **Superimposed Plots** | Overlay multiple metrics on a single chart (e.g., train/loss + eval/loss). |
| **Pinned Card Reordering** | Drag-and-drop to organize your pinned charts in any order. |
| **Metric Descriptions** | Add hover tooltips with long-form descriptions for each metric. |
| **Programmatic Run Colors** | Hash-based stable colors by default; full programmatic control available. |
| **Color Sampler API** | Generate perceptually uniform color palettes using the OKLCH color space. |
| **Log/Symlog X-Axis** | Log and symmetric-log scales for both X and Y axes. |
| **Persistent Settings** | Tag filters, run selections, pins, and section expansion survive page refreshes. |
| **Default Run Selection** | All runs visible by default; no more blank dashboards. |
| **Pin Limit Increase** | Up to 1,000 pinned cards (TensorBoard's URL-based limit was ~10-20). |

---

## Dashboard Profiles

Traditional TensorBoard stores dashboard state in the URL, which hits browser URL length limits with complex configurations. TensorBored profiles solve this by storing everything in browser localStorage.

### Using the Profile Menu

The profile menu is accessed via the **bookmark icon** in the top navigation bar.

| Action | Description |
|--------|-------------|
| **Save As New** | Save the current dashboard state (pins, colors, filters, smoothing, etc.) as a named profile |
| **Load Profile** | Restore a previously saved profile |
| **Export Profile** | Download the active profile as a JSON file |
| **Import Profile** | Load a profile from a JSON file (e.g., shared by a teammate) |
| **Delete Profile** | Remove a saved profile |
| **Deactivate Profile** | Return to default state with no active profile |
| **Clear All Profiles** | Remove all saved profiles |

An orange dot appears on the bookmark icon when you have unsaved changes relative to the active profile.

### Exporting and Importing Profiles

Profiles are exported as JSON files, making them easy to share:

1. Save a profile or load the default profile
2. Click the bookmark icon → "Export Profile"
3. Send the downloaded `.json` file to a teammate
4. They click bookmark icon → "Import Profile" → select the file

This replaces TensorBoard's approach of sharing long URLs.

### Setting Default Profiles from Python

The most powerful feature: configure the dashboard **before users even open it**.

```python
from tensorbored.plugins.core import profile_writer, color_sampler

# This writes <logdir>/.tensorboard/default_profile.json
profile_writer.set_default_profile(
    logdir='/path/to/logs',
    name='Training Monitor',

    # Pin your most important metrics at the top
    pinned_cards=[
        profile_writer.pin_scalar('train/loss'),
        profile_writer.pin_scalar('eval/loss'),
        profile_writer.pin_scalar('train/accuracy'),
        profile_writer.pin_scalar('eval/accuracy'),
        profile_writer.pin_scalar('learning_rate'),
    ],

    # Create comparison charts
    superimposed_cards=[
        profile_writer.create_superimposed_card(
            title='Train vs Eval Loss',
            tags=['train/loss', 'eval/loss'],
        ),
    ],

    # Assign colors to runs
    run_colors={
        'baseline': '#9E9E9E',
        'experiment_v1': '#2196F3',
        'experiment_v2': '#4CAF50',
    },

    # Add metric descriptions (shown as hover tooltips)
    metric_descriptions={
        'train/loss': 'Cross-entropy loss on the training set.',
        'eval/loss': 'Cross-entropy loss on the held-out validation set.',
        'learning_rate': 'Effective learning rate after warmup and cosine decay.',
    },

    # Default filter and smoothing
    tag_filter='loss|accuracy|learning_rate',
    smoothing=0.8,

    # Group runs by regex pattern
    group_by={
        'key': 'regex',
        'regexString': r'(baseline|experiment)',
    },

    # Control which sections are expanded on load
    expanded_tag_groups={
        'train': True,
        'eval': True,
        'debug': False,
    },
)
```

The default profile auto-applies when a user opens TensorBored at this logdir, but only if they don't already have a local profile active. User-created profiles always take priority over the backend default.

### Profile Data Schema

A profile contains the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `version` | `int` | Schema version (currently 1) |
| `name` | `str` | Human-readable profile name |
| `pinnedCards` | `list[dict]` | Cards to pin (each has `plugin`, `tag`, optional `runId`, `sample`) |
| `runColors` | `list[dict]` | Run color overrides (`runId` + hex `color`) |
| `groupColors` | `list[dict]` | Group color assignments (`groupKey` + `colorId`) |
| `superimposedCards` | `list[dict]` | Multi-tag chart definitions (`id`, `title`, `tags`, optional `runId`) |
| `runSelection` | `list[dict]` | Which runs are visible (`type`, `value`, `selected`) |
| `metricDescriptions` | `dict[str, str]` | Tag → long-form description mapping |
| `tagFilter` | `str` | Regex to filter visible tags |
| `runFilter` | `str` | Regex to filter visible runs |
| `smoothing` | `float` | Scalar smoothing value (0.0–0.999) |
| `groupBy` | `dict or null` | Run grouping config (`key` + optional `regexString`) |
| `expandedTagGroups` | `dict[str, bool]` | Which tag group sections are expanded (`true`) or collapsed (`false`). Omit for default (first two expanded). |

---

## Superimposed Plots

Compare multiple metrics on a single chart by superimposing them. This is invaluable for comparing train vs. eval curves, or seeing how different metrics evolve together.

### Creating Superimposed Plots in the UI

1. Hover over any scalar card and open its menu (three dots)
2. Select **"Add to superimposed plot"**
3. Choose **"Create new superimposed plot"** or add to an existing one
4. Superimposed cards appear in a dedicated section of the dashboard
5. Each tag gets a distinct color; the title auto-updates (e.g., `loss + accuracy`)
6. Remove tags by clicking the X on tag chips
7. If all tags are removed, the superimposed card is automatically deleted

Superimposed cards support:
- Y-axis scale cycling: Linear → Log → SymLog → Linear
- X-axis scale cycling (for Step/Relative): Linear → Log → SymLog → Linear
- Pan and zoom
- Fullscreen toggle

### Pre-configuring Superimposed Plots from Python

```python
from tensorbored.plugins.core import profile_writer

profile_writer.set_default_profile(
    logdir='./logs',
    superimposed_cards=[
        profile_writer.create_superimposed_card(
            title='Train vs Eval Loss',
            tags=['loss/train', 'loss/eval'],
        ),
        profile_writer.create_superimposed_card(
            title='All Accuracies',
            tags=['accuracy/train', 'accuracy/eval', 'accuracy/test'],
        ),
        profile_writer.create_superimposed_card(
            title='Loss + Grad Norm',
            tags=['loss/train', 'gradients/global_norm'],
        ),
    ],
)
```

---

## Pinned Card Reordering

Organize your pinned cards in any order:

- **Drag-and-drop**: Click and hold the card header, drag to a new position
- **Arrow buttons**: Use the left/right arrow buttons on each card for precise positioning
- The drag handle is on the card header/control row, so dragging does not interfere with chart interactions (zoom, pan)
- Order persists across page refreshes when "Save Pinned Cards" is enabled
- Order is saved within profiles

TensorBored supports up to **1,000 pinned cards** (TensorBoard's URL-based approach was limited to ~10-20 depending on tag name length).

---

## Metric Descriptions

Add long-form descriptions that appear as hover tooltips on metric card headers. This is especially useful when you have many metrics with cryptic short names.

```python
from tensorbored.plugins.core import profile_writer

profile_writer.set_default_profile(
    logdir='./logs',
    metric_descriptions={
        'loss/train': 'Cross-entropy training loss used for backpropagation.',
        'loss/eval': 'Cross-entropy loss on the held-out validation split, computed every 100 steps.',
        'accuracy/train': 'Top-1 classification accuracy on the training batch.',
        'accuracy/eval': 'Top-1 classification accuracy on the full validation set.',
        'learning_rate': 'Effective learning rate after linear warmup (50 steps) and cosine decay.',
        'gradients/global_norm': 'Global L2 norm of all model gradients before clipping.',
    },
)
```

Descriptions are set via the `metric_descriptions` parameter in the profile writer. They support Markdown formatting. The descriptions are served by the backend through the `/data/tags` endpoint and displayed as tooltips on scalar, histogram, and image cards.

---

## Programmatic Run Colors

### Stable Hash-Based Colors

In stock TensorBoard, run colors are randomly assigned and change on every page refresh. TensorBored computes colors deterministically from the run ID hash:

- Same run always gets the same color
- Colors are stable across page refreshes and browser sessions
- No configuration needed — this is the default behavior

### Setting Colors from Python

For full control, assign colors explicitly:

```python
from tensorbored.plugins.core import profile_writer

profile_writer.set_default_profile(
    logdir='./logs',
    run_colors={
        'baseline': '#9E9E9E',       # Gray
        'experiment_v1': '#2196F3',   # Blue
        'experiment_v2': '#4CAF50',   # Green
        'experiment_v3': '#FF9800',   # Orange
    },
)
```

Colors persist in browser localStorage, so they survive refreshes and are included in exported profiles.

### The Color Sampler API

Generate perceptually uniform color palettes using the OKLCH color space. Equal steps in OKLCH correspond to equal perceived color differences, making colors easy to distinguish.

```python
from tensorbored.plugins.core import color_sampler

# Generate n evenly-spaced colors
colors = color_sampler.sample_colors(5)
# ['#dc8a78', '#a4b93e', '#40c4aa', '#7aa6f5', '#d898d5']

# Auto-assign colors to a list of run IDs
run_colors = color_sampler.colors_for_runs(['train', 'eval', 'test'])
# {'train': '#dc8a78', 'eval': '#5fba72', 'test': '#7a9ef7'}

# Use the ColorMap class for index-based access
cm = color_sampler.ColorMap(5)
cm(0)  # '#dc8a78'
cm(2)  # '#40c4aa'
run_colors = {rid: cm(i) for i, rid in enumerate(run_ids)}

# For many runs (>8), use varied lightness/chroma for better distinction
run_colors = color_sampler.colors_for_runs(run_ids, varied=True)
# or
colors = color_sampler.sample_colors_varied(20)

# Preset palettes
categorical = color_sampler.palette_categorical(8)      # High chroma, chart-optimized
sequential = color_sampler.palette_sequential(5, hue=250)  # Blue, light to dark
diverging = color_sampler.palette_diverging(7)           # Blue → neutral → orange

# Color utilities
lighter = color_sampler.lighten('#2196F3', 0.1)
darker = color_sampler.darken('#2196F3', 0.1)
```

#### Combining Color Sampler with Profile Writer

```python
from tensorbored.plugins.core import profile_writer, color_sampler

run_names = ['baseline', 'adam_lr1e-3', 'adam_lr1e-4', 'large_batch', 'small_batch']
run_colors = color_sampler.colors_for_runs(run_names, varied=True)

profile_writer.set_default_profile(
    logdir='./logs',
    name='Experiment Comparison',
    run_colors=run_colors,
    pinned_cards=[profile_writer.pin_scalar('loss/train')],
)
```

---

## Log Scale and Symlog for Axes

### Y-Axis Scale

Open the overflow menu (three dots) on any scalar card and click the Y-axis scale option. It cycles through:

1. **Linear** — Standard linear scale
2. **Log** — Logarithmic (base 10) scale
3. **SymLog** — Symmetric logarithmic scale

### X-Axis Scale

Available when the X-axis is set to **Step** or **Relative** (not available for Wall Time):

Open the overflow menu and click the X-axis scale option. Same cycle: Linear → Log → SymLog.

### Symmetric Log Scale (SymLog)

Standard log scales cannot handle zero or negative values. SymLog uses the log-modulus transformation:

```
symlog(x) = sign(x) * log10(|x| + 1)
```

This provides:
- **Linear behavior near zero** — smooth transition, no discontinuity
- **Logarithmic behavior for large values** — compresses the scale for both positive and negative extremes
- **Handles negative values** — unlike standard log scale

SymLog is ideal for:
- Metrics that span many orders of magnitude in both directions (e.g., gradient values)
- Loss functions that can go negative
- Any data where standard log scale would fail due to zeros or negatives

---

## Persistent Settings

TensorBored automatically persists your dashboard customizations to browser localStorage. These survive page refreshes and browser restarts.

### Tag Filter Persistence

The regex tag filter bar remembers your last setting:
- Type `loss|accuracy` → refresh → the filter is still there
- Clear the filter → refresh → it stays cleared (your explicit choice is remembered)
- If a profile has a default filter, your explicit override takes priority

### Run Selection Persistence

Which runs are visible/hidden is persisted:
- Toggle runs on/off → refresh → your selection is preserved
- Safety net: if your saved selection would hide **all** runs, TensorBored resets to all-visible

### Pin Persistence

Pinned cards are saved to localStorage:
- Pin cards → refresh → they are still pinned
- Pin order is preserved
- Up to 1,000 pinned cards supported

### Section Expansion Persistence

Which tag group sections are expanded or collapsed is persisted:
- Expand or collapse sections → refresh → your choice is preserved
- On first load with no persisted state, the first two sections are expanded by default
- Profiles can override this with the `expanded_tag_groups` parameter
- When a profile specifies `expanded_tag_groups`, those values are applied; when omitted, the default behavior (first two groups) is used

---

## Default Run Selection

When loading the dashboard:
- All runs are visible by default (unless a profile explicitly hides some)
- If you previously hid all runs, the default is restored on refresh (prevents blank dashboards)
- Profiles can specify which runs should be visible via `runSelection` or the convenience `selected_runs` parameter

---

## Migration from TensorBoard

TensorBored is a drop-in replacement:

| Aspect | Compatibility |
|--------|---------------|
| Event files | Reads the same `tfevents` files |
| Logdir structure | Fully compatible |
| CLI | Same flags (`--logdir`, `--port`, `--host`, etc.) |
| `SummaryWriter` | Use `from tensorbored.torch import SummaryWriter` (recommended) or existing `torch.utils.tensorboard` imports |
| `tf.summary` | Works with TensorFlow summary writers unchanged |
| URL-based pins | Legacy URL pins from TensorBoard still work |

To switch:

```bash
pip install tensorbored

# Instead of:
tensorboard --logdir ./logs

# Use:
tensorbored --logdir ./logs

# (Both commands work — 'tensorboard' is kept as an alias)
```

In your training scripts, replace:

```python
# Before:
from torch.utils.tensorboard import SummaryWriter

# After (recommended):
from tensorbored.torch import SummaryWriter
```

The `SummaryWriter` API is identical — only the import changes. You no longer need the `tensorboard` package installed.

---

## Complete Python API Reference

### profile_writer

**Module:** `tensorbored.plugins.core.profile_writer`

#### `set_default_profile(logdir, **kwargs) -> str`

Create and write a default profile in one call. Returns the path to the written profile file.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `logdir` | `str` | required | TensorBoard log directory |
| `name` | `str` | `"Default Profile"` | Display name for the profile |
| `pinned_cards` | `list[dict]` | `None` | Cards to pin (use helper functions below) |
| `run_colors` | `dict[str, str]` | `None` | Mapping of run name/ID → hex color string |
| `group_colors` | `list[dict]` | `None` | Group color assignments (`groupKey`, `colorId`) |
| `superimposed_cards` | `list[dict]` | `None` | Superimposed card definitions (use `create_superimposed_card`) |
| `run_selection` | `list[dict]` | `None` | Explicit run visibility (`type`, `value`, `selected`) |
| `selected_runs` | `list[str]` | `None` | Convenience: list of run names to select (all others hidden) |
| `metric_descriptions` | `dict[str, str]` | `None` | Tag → Markdown description mapping |
| `tag_filter` | `str` | `""` | Regex pattern to filter tags |
| `run_filter` | `str` | `""` | Regex pattern to filter runs |
| `smoothing` | `float` | `0.6` | Scalar smoothing (0.0–0.999) |
| `group_by` | `dict` | `None` | Grouping config (`key`: `"RUN"`, `"EXPERIMENT"`, `"REGEX"`, or `"REGEX_BY_EXP"`; optional `regexString`) |
| `expanded_tag_groups` | `dict[str, bool]` | `None` | Which tag group sections to expand/collapse (omit for default behavior) |

#### `create_profile(**kwargs) -> dict`

Create a profile dictionary without writing it. Same parameters as `set_default_profile` minus `logdir`.

#### `write_profile(logdir, profile) -> str`

Write a profile dict to `<logdir>/.tensorboard/default_profile.json`.

#### `read_profile(logdir) -> dict | None`

Read the default profile from a logdir. Returns `None` if no profile exists or the file is invalid.

#### `pin_scalar(tag) -> dict`

Helper to create a pinned scalar card entry.

```python
profile_writer.pin_scalar('train/loss')
# Returns: {'plugin': 'scalars', 'tag': 'train/loss'}
```

#### `pin_histogram(tag, run_id) -> dict`

Helper to create a pinned histogram card entry. `run_id` is required for histograms.

```python
profile_writer.pin_histogram('weights/fc1', run_id='experiment_v1')
# Returns: {'plugin': 'histograms', 'tag': 'weights/fc1', 'runId': 'experiment_v1'}
```

#### `pin_image(tag, run_id, sample=0) -> dict`

Helper to create a pinned image card entry.

```python
profile_writer.pin_image('samples/generated', run_id='experiment_v1', sample=0)
# Returns: {'plugin': 'images', 'tag': 'samples/generated', 'runId': 'experiment_v1', 'sample': 0}
```

#### `create_superimposed_card(title, tags, run_id=None) -> dict`

Helper to create a superimposed card entry combining multiple scalar tags.

```python
profile_writer.create_superimposed_card(
    title='Train vs Eval Loss',
    tags=['loss/train', 'loss/eval'],
)
# Returns: {'id': 'superimposed-<timestamp>', 'title': 'Train vs Eval Loss',
#           'tags': ['loss/train', 'loss/eval'], 'runId': None}
```

### color_sampler

**Module:** `tensorbored.plugins.core.color_sampler`

#### `sample_colors(n, lightness=0.7, chroma=0.15, hue_start=0.0, hue_range=360.0) -> list[str]`

Generate `n` perceptually uniform, evenly-spaced hex colors.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `n` | `int` | required | Number of colors |
| `lightness` | `float` | `0.7` | OKLCH lightness (0–1). ~0.65 for dark backgrounds. |
| `chroma` | `float` | `0.15` | OKLCH chroma (0–0.4). Higher = more saturated. |
| `hue_start` | `float` | `0.0` | Starting hue angle in degrees (0–360) |
| `hue_range` | `float` | `360.0` | Range of hues to span |

#### `sample_colors_varied(n, lightness_range=(0.55, 0.8), chroma_range=(0.12, 0.18)) -> list[str]`

Generate `n` colors with varied lightness and chroma for maximum visual distinction. Recommended for >8 colors.

#### `ColorMap(n, lightness=0.7, chroma=0.15, hue_start=0.0, varied=False)`

Callable color map. `cm(i)` returns the i-th color. Supports `len()`, iteration, and indexing.

```python
cm = color_sampler.ColorMap(10, varied=True)
cm(0)   # First color
cm(9)   # Last color
cm(15)  # Wraps around: same as cm(5)
list(cm) # All 10 colors
```

#### `colors_for_runs(run_ids, lightness=0.7, chroma=0.15, varied=False) -> dict`

Auto-assign colors to a list of run IDs. Automatically uses `varied=True` when `len(run_ids) > 8`.

```python
color_sampler.colors_for_runs(['train', 'eval', 'test'])
# {'train': '#dc8a78', 'eval': '#5fba72', 'test': '#7a9ef7'}
```

#### `palette_categorical(n) -> list[str]`

Chart-optimized categorical palette (high chroma, medium lightness).

#### `palette_sequential(n, hue=250) -> list[str]`

Sequential palette from light to dark at a single hue. Default is blue.

#### `palette_diverging(n, hue_low=250, hue_high=30) -> list[str]`

Diverging palette from one hue through neutral to another. Default: blue → neutral → orange. Works best with odd `n`.

#### `lighten(hex_color, amount=0.1) -> str`

Lighten a hex color by increasing its OKLCH lightness.

#### `darken(hex_color, amount=0.1) -> str`

Darken a hex color by decreasing its OKLCH lightness.

---

## Examples

### Minimal Example

The simplest possible usage — just point at your logdir:

```bash
pip install tensorbored
tensorbored --logdir ./my_experiment/logs
```

### Full Training Script Example

A complete PyTorch training script with TensorBored integration:

```python
import torch
import torch.nn as nn
import torch.optim as optim
from tensorbored.torch import SummaryWriter

# TensorBored extensions (optional — only needed for dashboard config)
from tensorbored.plugins.core import profile_writer, color_sampler


def setup_dashboard(logdir: str, run_names: list):
    """Configure TensorBored dashboard before training starts."""
    run_colors = color_sampler.colors_for_runs(run_names, varied=True)

    profile_writer.set_default_profile(
        logdir=logdir,
        name='Training Dashboard',
        pinned_cards=[
            profile_writer.pin_scalar('loss/train'),
            profile_writer.pin_scalar('loss/eval'),
            profile_writer.pin_scalar('accuracy/eval'),
            profile_writer.pin_scalar('learning_rate'),
        ],
        superimposed_cards=[
            profile_writer.create_superimposed_card(
                title='Train vs Eval Loss',
                tags=['loss/train', 'loss/eval'],
            ),
        ],
        run_colors=run_colors,
        metric_descriptions={
            'loss/train': 'Cross-entropy loss on the training batch.',
            'loss/eval': 'Cross-entropy loss on the validation set (computed every epoch).',
            'accuracy/eval': 'Top-1 accuracy on the validation set.',
            'learning_rate': 'Current learning rate (with warmup and cosine decay).',
        },
        smoothing=0.8,
        tag_filter='loss|accuracy|learning_rate',
    )


def train(config):
    model = MyModel().to(config['device'])
    optimizer = optim.Adam(model.parameters(), lr=config['lr'])
    criterion = nn.CrossEntropyLoss()

    writer = SummaryWriter(log_dir=f"{config['logdir']}/{config['run_name']}")

    for step in range(config['total_steps']):
        # ... training loop ...
        loss = criterion(model(inputs), targets)
        loss.backward()
        optimizer.step()

        if step % 10 == 0:
            writer.add_scalar('loss/train', loss.item(), step)
            writer.add_scalar('accuracy/eval', eval_accuracy, step)
            writer.add_scalar('learning_rate', optimizer.param_groups[0]['lr'], step)

        if step % 100 == 0:
            for name, param in model.named_parameters():
                writer.add_histogram(f'weights/{name}', param, step)

    writer.close()


if __name__ == '__main__':
    logdir = './logs'
    run_names = ['baseline', 'experiment_v1', 'experiment_v2']

    # Set up dashboard once (before any training)
    setup_dashboard(logdir, run_names)

    # Train each run
    for name in run_names:
        train({'logdir': logdir, 'run_name': name, 'lr': 0.001,
               'total_steps': 1000, 'device': 'cuda'})
```

Then view results:

```bash
tensorbored --logdir ./logs
```

### Multi-Experiment Dashboard

Configure a dashboard comparing multiple hyperparameter sweeps:

```python
from tensorbored.plugins.core import profile_writer, color_sampler

# Your experiment runs
runs = {
    'lr=1e-2': '#F44336',   # Red — diverged
    'lr=1e-3': '#2196F3',   # Blue — best
    'lr=1e-4': '#4CAF50',   # Green — slow but steady
    'lr=1e-5': '#FF9800',   # Orange — too slow
}

profile_writer.set_default_profile(
    logdir='./sweep_logs',
    name='Learning Rate Sweep',
    pinned_cards=[
        profile_writer.pin_scalar('loss/train'),
        profile_writer.pin_scalar('loss/eval'),
        profile_writer.pin_scalar('accuracy/eval'),
    ],
    superimposed_cards=[
        profile_writer.create_superimposed_card(
            title='All Training Losses',
            tags=['loss/train', 'loss/eval'],
        ),
    ],
    run_colors=runs,
    metric_descriptions={
        'loss/train': 'Training loss (cross-entropy). Watch for divergence with lr=1e-2.',
        'loss/eval': 'Validation loss. Compare convergence rates across learning rates.',
        'accuracy/eval': 'Validation accuracy. lr=1e-3 should reach the highest.',
    },
    smoothing=0.6,
    tag_filter='loss|accuracy',
    # Only show the best runs by default
    selected_runs=['lr=1e-3', 'lr=1e-4'],
)
```

---

## Storage Architecture

TensorBored uses browser localStorage for client-side persistence:

| Key Pattern | Contents |
|-------------|----------|
| `_tb_profile.<name>` | Saved dashboard profile data (JSON) |
| `_tb_profiles_index` | List of all saved profile names |
| `_tb_active_profile` | Name of the currently active profile |
| `_tb_run_selection.v1` | Run visibility states |
| `_tb_run_colors.v1` | Custom run color overrides |
| `_tb_tag_filter.v1` | Tag filter regex with timestamp |
| `_tb_tag_group_expansion.v1` | Section expanded/collapsed state |
| `tb-saved-pins` | Pinned card list |

Server-side, the only file TensorBored writes is the default profile:

```
<logdir>/.tensorboard/default_profile.json
```

This file is read by the backend's `/data/profile` endpoint and served to the frontend on load.

---

## Live Demo

A live demo with synthetic training data is deployed on HuggingFace Spaces:

**https://demonstrandum-tensorbored-sample.hf.space**

The demo includes 5 simulated training runs (baseline, adam_lr1e-3, adam_lr1e-4, large_batch, small_batch) with scalar metrics, histograms, images, and a pre-configured default profile showing all features.

---

## FAQ

**Q: Do I need to change my logging code?**
No. TensorBored reads standard `tfevents` files. Your existing `SummaryWriter` or `tf.summary` code works unchanged. The new features (profiles, colors, etc.) are optional additions. For new PyTorch projects, we recommend `from tensorbored.torch import SummaryWriter` — it is a drop-in replacement that removes the need to install the original `tensorboard` package.

**Q: Where are profiles stored?**
Client-side profiles are in browser localStorage. The default profile (set from Python) is at `<logdir>/.tensorboard/default_profile.json`.

**Q: Can I use TensorBored with TensorFlow?**
Yes. TensorBored is a fork of TensorBoard and supports all TensorFlow summary types. It also works with PyTorch's `SummaryWriter`.

**Q: Do I need to install `tensorboard` alongside `tensorbored`?**
No. When the real `tensorboard` package is not installed, `tensorbored` automatically registers itself under the `tensorboard` module name. Libraries like PyTorch that `import tensorboard` internally will resolve to `tensorbored` transparently. Use `from tensorbored.torch import SummaryWriter` and you only need `tensorbored` + `torch` installed.

**Q: What happens if I have too many runs for distinct colors?**
Use `color_sampler.colors_for_runs(run_ids, varied=True)` or `color_sampler.sample_colors_varied(n)` which vary lightness and chroma in addition to hue, providing better distinction for large numbers of runs.

**Q: Can I use both `tensorboard` and `tensorbored` CLI commands?**
Yes, both are registered as entry points. They run the same code.

**Q: What is the maximum number of pinned cards?**
TensorBored supports up to 1,000 pinned cards. TensorBoard's URL-based approach was limited to roughly 10-20 depending on tag name lengths.

**Q: Does the default profile overwrite my local settings?**
No. If you have an active local profile, the backend default profile is not applied. User-created profiles always take priority.

**Q: What Python versions are supported?**
Python 3.9 and above.
