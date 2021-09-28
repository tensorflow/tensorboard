# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Classes and functions for handling the GetExperiment API call."""


from tensorboard import errors


class Handler(object):
    """Handles a GetExperiment request."""

    def __init__(self, request_context, backend_context, experiment_id):
        """Constructor.

        Args:
          request_context: A tensorboard.context.RequestContext.
          backend_context: A backend_context.Context instance.
          experiment_id: A string, as from `plugin_util.experiment_id`.
        """
        self._request_context = request_context
        self._backend_context = backend_context
        self._experiment_id = experiment_id

    def run(self):
        """Handles the request specified on construction.

        Returns:
          An Experiment object.
        """
        experiment_id = self._experiment_id
        experiment = self._backend_context.experiment_from_metadata(
            self._request_context,
            experiment_id,
            self._backend_context.hparams_metadata(
                self._request_context, experiment_id
            ),
        )
        if experiment is None:
            raise errors.NotFoundError(
                "Can't find an HParams-plugin experiment data in"
                " the log directory. Note that it takes some time to"
                " scan the log directory; if you just started"
                " Tensorboard it could be that we haven't finished"
                " scanning it yet. Consider trying again in a"
                " few seconds."
            )
        return experiment
