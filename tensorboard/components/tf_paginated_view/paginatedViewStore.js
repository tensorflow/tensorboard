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
var tf_paginated_view;
(function (tf_paginated_view) {
    var LIMIT_LOCAL_STORAGE_KEY = 'TF.TensorBoard.PaginatedView.limit';
    var DEFAULT_LIMIT = 12; // reasonably small and has lots of factors
    var _limit = null; // cached localStorage value
    var listeners = new Set();
    /**
     * Register a listener (nullary function) to be called when the page
     * limit changes.
     */
    function addLimitListener(listener) {
        listeners.add(listener);
    }
    tf_paginated_view.addLimitListener = addLimitListener;
    /**
     * Remove a listener registered with `addLimitListener`.
     */
    function removeLimitListener(listener) {
        listeners.delete(listener);
    }
    tf_paginated_view.removeLimitListener = removeLimitListener;
    function getLimit() {
        if (_limit == null) {
            _limit = tf_storage.getNumber(LIMIT_LOCAL_STORAGE_KEY, /*useLocalStorage=*/ true);
            if (_limit == null || !isFinite(_limit) || _limit <= 0) {
                _limit = DEFAULT_LIMIT;
            }
        }
        return _limit;
    }
    tf_paginated_view.getLimit = getLimit;
    function setLimit(limit) {
        if (limit !== Math.floor(limit)) {
            throw new Error("limit must be an integer, but got: " + limit);
        }
        if (limit <= 0) {
            throw new Error("limit must be positive, but got: " + limit);
        }
        if (limit === _limit) {
            return;
        }
        _limit = limit;
        tf_storage.setNumber(LIMIT_LOCAL_STORAGE_KEY, _limit, /*useLocalStorage=*/ true);
        listeners.forEach(function (listener) {
            listener();
        });
    }
    tf_paginated_view.setLimit = setLimit;
})(tf_paginated_view || (tf_paginated_view = {})); // namespace tf_paginated_view
