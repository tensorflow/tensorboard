---
name: Installation problem
about: Get help installing or starting TensorBoard
title: ''
labels: ''
assignees: ''

---

Use this template if you have a problem building, installing,
configuring, or starting TensorBoard and you suspect that there is a
problem with TensorBoard itself.

Consider first reaching out to Stack Overflow for support—they have a
larger community with better searchability:

<https://stackoverflow.com/questions/tagged/tensorboard>

## Environment information (required)

Please complete **ALL** of the following information:

  - Version strings for the following Python packages, if installed, as
    listed by `pip freeze`:
      - `tensorboard`:
      - `tb-nightly`:
      - `tensorflow`:
      - `tf-nightly`:
      - `tf-nightly-2.0-preview`:
  - OS platform and version (e.g., Linux with Ubuntu 16.04):
  - Mode of installation (e.g., pip inside virtualenv; Conda):
  - Python version (e.g., 2.7; 3.5):

## Script to reproduce (required)

Please write a self-contained shell script or Batch script that
reproduces the problem in a fresh virtualenv without site packages or a
fresh Conda environment without additional user interaction:

```sh
#!/bin/sh
set -eux
cd "$(mktemp -d)"
export PYTHONNOUSERSITE=1  # for Conda users

# Create a new virtualenv for testing purposes.
virtualenv -q -p python3.6 --no-site-packages ./ve
. ./ve/bin/activate

# Set up the virtualenv and install TensorBoard somehow...
# YOUR INSTALLATION STEPS HERE

# Try to run TensorBoard.
tensorboard --logdir ./logs/
```

If while attempting to write this script you discover that TensorBoard
works fine in a fresh virtualenv, but you continue to have the problem
in your normal environment, then that’s good news: you can use this
information to help narrow down the problem before posting your issue.
If you suspect that your normal environment is in a bad state, consider
deleting it entirely and starting from a fresh virtualenv or Conda
environment.
