/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
var tf;
(function (tf) {
    var graph;
    (function (graph) {
        var scene;
        (function (scene) {
            var contextmenu;
            (function (contextmenu) {
                /**
                 * Returns the event listener, which can be used as an argument for the d3
                 * selection.on function. Renders the context menu that is to be displayed
                 * in response to the event.
                 */
                function getMenu(menu) {
                    var menuSelection = d3.select('.context-menu');
                    // Close the menu when anything else is clicked.
                    d3.select('body').on('click.context', function () { menuSelection.style('display', 'none'); });
                    // Function called to populate the context menu.
                    return function (data, index) {
                        var _this = this;
                        // Position and display the menu.
                        var event = d3.event;
                        menuSelection
                            .style('display', 'block')
                            .style('left', (event.layerX + 1) + 'px')
                            .style('top', (event.layerY + 1) + 'px');
                        // Stop the event from propagating further.
                        event.preventDefault();
                        event.stopPropagation();
                        // Add provided items to the context menu.
                        menuSelection.html('');
                        var list = menuSelection.append('ul');
                        list.selectAll('li')
                            .data(menu)
                            .enter()
                            .append('li')
                            .html(function (d) { return d.title(data); })
                            .on('click', function (d, i) {
                            d.action(_this, data, index);
                            menuSelection.style('display', 'none');
                        });
                    };
                }
                contextmenu.getMenu = getMenu;
                ;
            })(contextmenu = scene.contextmenu || (scene.contextmenu = {}));
        })(scene = graph.scene || (graph.scene = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {})); // close module
