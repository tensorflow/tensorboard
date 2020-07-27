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
                 * Returns the top and left distance of the scene element from the top left
                 * corner of the screen.
                 */
                function getOffset(sceneElement) {
                    let leftDistance = 0;
                    let topDistance = 0;
                    let currentElement = sceneElement;
                    while (currentElement &&
                        currentElement.offsetLeft >= 0 &&
                        currentElement.offsetTop >= 0) {
                        leftDistance += currentElement.offsetLeft - currentElement.scrollLeft;
                        topDistance += currentElement.offsetTop - currentElement.scrollTop;
                        currentElement = currentElement.offsetParent;
                    }
                    return {
                        left: leftDistance,
                        top: topDistance,
                    };
                }
                /**
                 * Returns the event listener, which can be used as an argument for the d3
                 * selection.on function. Renders the context menu that is to be displayed
                 * in response to the event.
                 */
                function getMenu(sceneElement, menu) {
                    const menuNode = sceneElement.getContextMenu();
                    const menuSelection = d3.select(sceneElement.getContextMenu());
                    // Function called to populate the context menu.
                    return function (data, index) {
                        // Position and display the menu.
                        let event = d3.event;
                        const sceneOffset = getOffset(sceneElement);
                        menuSelection
                            .style('display', 'block')
                            .style('left', event.clientX - sceneOffset.left + 1 + 'px')
                            .style('top', event.clientY - sceneOffset.top + 1 + 'px');
                        // Stop the event from propagating further.
                        event.preventDefault();
                        event.stopPropagation();
                        function maybeCloseMenu(event) {
                            if (event && event.composedPath().includes(menuNode)) {
                                return;
                            }
                            menuSelection.style('display', 'none');
                            document.body.removeEventListener('mousedown', maybeCloseMenu, {
                                capture: true,
                            });
                        }
                        // Dismiss and remove the click listener as soon as there is a mousedown
                        // on the document. We use capture listener so no component can stop
                        // context menu from dismissing due to stopped propagation.
                        document.body.addEventListener('mousedown', maybeCloseMenu, {
                            capture: true,
                        });
                        // Add provided items to the context menu.
                        menuSelection.html('');
                        let list = menuSelection.append('ul');
                        list
                            .selectAll('li')
                            .data(menu)
                            .enter()
                            .append('li')
                            .on('click', (d, i) => {
                            d.action(this, data, index);
                            maybeCloseMenu();
                        })
                            .html(function (d) {
                            return d.title(data);
                        });
                    };
                }
                contextmenu.getMenu = getMenu;
            })(contextmenu = scene.contextmenu || (scene.contextmenu = {}));
        })(scene = graph.scene || (graph.scene = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {})); // close module
