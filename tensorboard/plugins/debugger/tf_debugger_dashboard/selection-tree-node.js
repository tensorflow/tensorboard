/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
var tf_debugger_dashboard;
(function (tf_debugger_dashboard) {
    /**
     * A string used to separate parts of a node name. Should be kept consistent
     * with the graph component.
     */
    tf_debugger_dashboard.NODE_NAME_SEPARATOR = '/';
    tf_debugger_dashboard.DEVICE_NAME_PATTERN = /^\/job:[A-Za-z0-9_]+\/replica:[0-9_]+\/task:[0-9]+\/device:[A-Za-z0-9_]+:[0-9]+/;
    // A checkbox is partially checked if it is a checkbox for a non-leaf node and
    // some (but not all) of its children are checked.
    let CheckboxState;
    (function (CheckboxState) {
        CheckboxState[CheckboxState["EMPTY"] = 0] = "EMPTY";
        CheckboxState[CheckboxState["CHECKED"] = 1] = "CHECKED";
        CheckboxState[CheckboxState["PARTIAL"] = 2] = "PARTIAL";
    })(CheckboxState = tf_debugger_dashboard.CheckboxState || (tf_debugger_dashboard.CheckboxState = {}));
    /**
     * Split a node name, potentially with a device name prefix.
     * @param name: Input node name, potentially with a device name prefix, e.g.,
     *   '/job:localhost/replica:0/task:0/device:CPU:0/Dense/BiasAdd'
     * @return Split items. The device name, if present, will be the first item.
     */
    function splitNodeName(name) {
        let items = [];
        const deviceNameMatches = name.match(tf_debugger_dashboard.DEVICE_NAME_PATTERN);
        let nodeName = name;
        if (deviceNameMatches != null) {
            items.push(deviceNameMatches[0]);
            // Expect there to be a slash after the device name, and skip it.
            if (nodeName[deviceNameMatches[0].length] !== '/') {
                console.error('No slash ("/") after device name in node name:', nodeName);
            }
            nodeName = nodeName.slice(deviceNameMatches[0].length + 1);
        }
        return items.concat(nodeName.split(tf_debugger_dashboard.NODE_NAME_SEPARATOR));
    }
    tf_debugger_dashboard.splitNodeName = splitNodeName;
    /**
     * Get a node name without device name prefix or base-expansion suffix.
     * @param name: The node name, possibly with a device name prefix, e.g.,
     *   '/job:localhost/replica:0/task:0/device:CPU:0/Dense/BiasAdd'
     * @return The node name without any device name prefixes or '/' at the front.
     *   E.g., 'Dense/BiasAdd'
     */
    function getCleanNodeName(name) {
        let cleanName = name;
        const deviceNameMatches = name.match(tf_debugger_dashboard.DEVICE_NAME_PATTERN);
        if (deviceNameMatches != null) {
            if (cleanName.length > deviceNameMatches[0].length &&
                cleanName[deviceNameMatches[0].length] != '/') {
                console.error('No slash ("/") after device name in node name:', name);
            }
            cleanName = cleanName.slice(deviceNameMatches[0].length + 1);
        }
        else {
            if (cleanName[0] === '/') {
                cleanName = cleanName.slice(1);
            }
        }
        // Remove any base-expansion suffix.
        if (cleanName.indexOf(')') === cleanName.length - 1) {
            cleanName = cleanName.slice(0, cleanName.indexOf('/('));
        }
        return cleanName;
    }
    tf_debugger_dashboard.getCleanNodeName = getCleanNodeName;
    /**
     * Sort and base-expand an Array of DebugWatches in place.
     * "Base-expand" means adding a '/(baseName)' suffix to nodes whose names are
     * the name scope of some other node's name.
     * @param debugWatches: An array of `DebugWatch`es to sort and base-expand.
     * @returns Sorted and base-expanded `DebugWatch`es.
     */
    function sortAndBaseExpandDebugWatches(debugWatches) {
        // Sort the debug watches.
        debugWatches.sort((watch1, watch2) => {
            if (watch1.node_name < watch2.node_name) {
                return -1;
            }
            else if (watch1.node_name > watch2.node_name) {
                return 1;
            }
            else {
                return watch1.output_slot - watch2.output_slot;
            }
        });
        // Find leaf nodes that need to be base-expanded due to their names being a
        // prefix of other nodes.
        for (let i = 0; i < debugWatches.length; ++i) {
            const withSlashSuffix = debugWatches[i].node_name + '/';
            let toBaseExpandLeaf = false;
            for (let j = i + 1; j < debugWatches.length; ++j) {
                if (debugWatches[j].node_name.indexOf(withSlashSuffix) === 0) {
                    toBaseExpandLeaf = true;
                    break;
                }
            }
            if (toBaseExpandLeaf) {
                const items = debugWatches[i].node_name.split('/');
                debugWatches[i].node_name += '/(' + items[items.length - 1] + ')';
            }
        }
    }
    tf_debugger_dashboard.sortAndBaseExpandDebugWatches = sortAndBaseExpandDebugWatches;
    /**
     * Remove any possible base expansion from a node name.
     * @param nodeName: The node name, possibly with base expansion.
     * @returns: Node name with any base expansion removed. If `nodeName` does not
     *   contain any base expansion, the string is returned without modification.
     */
    function removeNodeNameBaseExpansion(nodeName) {
        if (nodeName.endsWith(')')) {
            return nodeName.slice(0, nodeName.lastIndexOf('/('));
        }
        else {
            return nodeName;
        }
    }
    tf_debugger_dashboard.removeNodeNameBaseExpansion = removeNodeNameBaseExpansion;
    function assembleDeviceAndNodeNames(nameItems) {
        const deviceAndNodeNames = [null, null];
        if (nameItems[0].match(tf_debugger_dashboard.DEVICE_NAME_PATTERN)) {
            let deviceName = nameItems[0];
            if (deviceName[deviceName.length - 1] === '/') {
                deviceName = deviceName.slice(0, deviceName.length - 1);
            }
            deviceAndNodeNames[0] = deviceName;
            deviceAndNodeNames[1] = nameItems.slice(1).join('/');
        }
        else {
            deviceAndNodeNames[1] = nameItems.join('/');
        }
        return deviceAndNodeNames;
    }
    tf_debugger_dashboard.assembleDeviceAndNodeNames = assembleDeviceAndNodeNames;
    let DebugWatchFilterMode;
    (function (DebugWatchFilterMode) {
        DebugWatchFilterMode[DebugWatchFilterMode["NodeName"] = 0] = "NodeName";
        DebugWatchFilterMode[DebugWatchFilterMode["OpType"] = 1] = "OpType";
    })(DebugWatchFilterMode = tf_debugger_dashboard.DebugWatchFilterMode || (tf_debugger_dashboard.DebugWatchFilterMode = {}));
    /**
     * Filter debug watches according to given filter mode and filter input.
     * @param debugWatches An array of `DebugWatch` instances.
     * @param filterMode
     * @param filterRegex Filter regular expression, e.g., for
     *   filterMode === 'Op Type': 'Variable.'.
     * @returns An array of `DebugWatch` instances from the input `debugWatches`
     *   that pass the filter.
     */
    function filterDebugWatches(debugWatches, filterMode, filterRegex) {
        if (filterMode === DebugWatchFilterMode.NodeName) {
            return debugWatches.filter((debugWatch) => debugWatch.node_name.match(filterRegex));
        }
        else if (filterMode === DebugWatchFilterMode.OpType) {
            return debugWatches.filter((debugWatch) => debugWatch.op_type.match(filterRegex));
        }
    }
    tf_debugger_dashboard.filterDebugWatches = filterDebugWatches;
    class SelectionTreeNode {
        constructor(name, debugWatchChange, parent, debugWatch) {
            this.debugWatchChange = debugWatchChange;
            this.debugWatch = debugWatch;
            this.name = name;
            this.debugWatch = debugWatch;
            // We start out empty.
            this.checkboxState = CheckboxState.EMPTY;
            this.parent = parent;
            this.children = {};
            this.checkbox = document.createElement('paper-checkbox');
            this.checkbox.addEventListener('change', () => {
                this._handleChange();
            }, false);
        }
        _handleChange() {
            if (this.avoidPropagation) {
                // Do not propagate.
                if (this.debugWatch) {
                    this.debugWatchChange(this.debugWatch, this.isCheckboxChecked());
                }
                return;
            }
            if (this.debugWatch) {
                // This is a leaf node.
                this.setCheckboxState(this.isCheckboxChecked()
                    ? CheckboxState.CHECKED
                    : CheckboxState.EMPTY, true);
                if (this.isCheckboxChecked()) {
                    // A checkbox just got checked. All nodes above this one are either
                    // partial or complete. Go up the tree and check.
                    this.setNodesAboveToChecked();
                }
                else {
                    // A checkbox got unchecked. All nodes above this are either empty or
                    // partial now.
                    this.setNodesAboveToEmpty();
                }
                // Run the callback.
                this.debugWatchChange(this.debugWatch, this.isCheckboxChecked());
            }
            else {
                // This is a meta node.
                this.setCheckboxState(this.isCheckboxChecked()
                    ? CheckboxState.CHECKED
                    : CheckboxState.EMPTY, true);
                if (this.isCheckboxChecked()) {
                    // Check all the nodes under it.
                    const descendants = _.values(this.children);
                    while (descendants.length) {
                        let node = descendants.pop();
                        _.forEach(node.children, (child) => descendants.push(child));
                        node.setCheckboxState(CheckboxState.CHECKED, true);
                    }
                    // Reconcile nodes above.
                    this.setNodesAboveToChecked();
                }
                else {
                    // Uncheck all the nodes under it.
                    const descendants = _.values(this.children);
                    while (descendants.length) {
                        let node = descendants.pop();
                        _.forEach(node.children, (child) => descendants.push(child));
                        node.setCheckboxState(CheckboxState.EMPTY, true);
                    }
                    // Reconcile nodes above.
                    this.setNodesAboveToEmpty();
                }
            }
        }
        isLeaf() {
            return !!this.debugWatch;
        }
        setToAllCheckedExternally() {
            this.setCheckboxState(CheckboxState.CHECKED);
            this._handleChange();
        }
        setCheckboxState(state, avoidPropagation) {
            this.avoidPropagation = avoidPropagation;
            this.checkboxState = state;
            this.checkbox.classList.toggle('partial-checkbox', state === CheckboxState.PARTIAL);
            if (state === CheckboxState.CHECKED) {
                this.checkbox.setAttribute('checked', 'checked');
            }
            else {
                this.checkbox.removeAttribute('checked');
            }
            this.avoidPropagation = false;
        }
        isCheckboxChecked() {
            return this.checkbox.hasAttribute('checked');
        }
        setNodesAboveToChecked() {
            let currentNode = this.parent;
            let partialFound = false;
            while (currentNode) {
                if (partialFound) {
                    // We found a PARTIAL checkbox lower in the tree. Higher up ones
                    // must also be partial (and can't be complete any more).
                    currentNode.setCheckboxState(CheckboxState.PARTIAL, true);
                }
                else {
                    const index = _.findIndex(_.values(currentNode.children), (child) => child.checkboxState !== CheckboxState.CHECKED);
                    // Either all or only some of the children were checked.
                    partialFound = index !== -1;
                    currentNode.setCheckboxState(partialFound ? CheckboxState.PARTIAL : CheckboxState.CHECKED, true);
                }
                // Move up the tree.
                currentNode = currentNode.parent;
            }
        }
        setNodesAboveToEmpty() {
            let currentNode = this.parent;
            let partialFound = false;
            while (currentNode) {
                if (partialFound) {
                    // We found a PARTIAL checkbox lower in the tree. Higher up ones
                    // must also be partial (and can't be complete any more).
                    currentNode.setCheckboxState(CheckboxState.PARTIAL, true);
                }
                else {
                    const index = _.findIndex(_.values(currentNode.children), (child) => child.checkboxState !== CheckboxState.EMPTY);
                    // Either all or only some of the children were empty.
                    partialFound = index !== -1;
                    currentNode.setCheckboxState(partialFound ? CheckboxState.PARTIAL : CheckboxState.EMPTY, true);
                }
                // Move up the tree.
                currentNode = currentNode.parent;
            }
        }
        setLevelDom(levelDom) {
            this.levelDom = levelDom;
        }
    }
    tf_debugger_dashboard.SelectionTreeNode = SelectionTreeNode;
})(tf_debugger_dashboard || (tf_debugger_dashboard = {})); // namespace tf_debugger_dashboard
