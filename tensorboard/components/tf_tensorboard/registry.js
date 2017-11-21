/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
var tf_tensorboard;
(function (tf_tensorboard) {
    var ActiveDashboardsLoadState;
    (function (ActiveDashboardsLoadState) {
        ActiveDashboardsLoadState["NOT_LOADED"] = "NOT_LOADED";
        ActiveDashboardsLoadState["LOADED"] = "LOADED";
        ActiveDashboardsLoadState["FAILED"] = "FAILED";
    })(ActiveDashboardsLoadState = tf_tensorboard.ActiveDashboardsLoadState || (tf_tensorboard.ActiveDashboardsLoadState = {}));
    /**
     * Map of all registered dashboards.
     *
     * This object should only be mutated by the registerDashboard() function.
     */
    tf_tensorboard.dashboardRegistry = {};
    /**
     * Registers Dashboard for plugin into TensorBoard frontend.
     *
     * This function should be called after the Polymer custom element is defined.
     * It's what allows the tf-tensorboard component to dynamically load it as a
     * tab in TensorBoard's GUI.
     *
     * `elementName` and `plugin` are mandatory. `tabName` defaults to `plugin`.
     */
    function registerDashboard(dashboard) {
        if (!dashboard.plugin) {
            throw new Error('Dashboard.plugin must be present');
        }
        if (!dashboard.elementName) {
            throw new Error('Dashboard.elementName must be present');
        }
        if (dashboard.plugin in tf_tensorboard.dashboardRegistry) {
            throw new Error("Plugin already registered: " + dashboard.plugin);
        }
        if (!dashboard.tabName) {
            dashboard.tabName = dashboard.plugin;
        }
        tf_tensorboard.dashboardRegistry[dashboard.plugin] = dashboard;
    }
    tf_tensorboard.registerDashboard = registerDashboard;
})(tf_tensorboard || (tf_tensorboard = {})); // namespace tf_tensorboard
