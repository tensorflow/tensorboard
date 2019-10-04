var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import { sendMessage, listen } from './plugin-guest.js';
export function getRuns() {
    return __awaiter(this, void 0, void 0, function* () {
        return sendMessage('experimental.GetRuns');
    });
}
export function setOnRunsChanged(callback) {
    return listen('experimental.RunsChanged', callback);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3RlbnNvcmJvYXJkL2NvbXBvbmVudHMvZXhwZXJpbWVudGFsL3BsdWdpbl9saWIvcnVucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7Ozs7Ozs7Ozs7O2dGQWFnRjtBQUNoRixPQUFPLEVBQUMsV0FBVyxFQUFFLE1BQU0sRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBRXRELE1BQU0sVUFBZ0IsT0FBTzs7UUFDM0IsT0FBTyxXQUFXLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0NBQUE7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsUUFBeUM7SUFDeEUsT0FBTyxNQUFNLENBQUMsMEJBQTBCLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDdEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIENvcHlyaWdodCAyMDE5IFRoZSBUZW5zb3JGbG93IEF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG5cbkxpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG55b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG5Zb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcblxuICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuXG5Vbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG5kaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG5XSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cblNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbmxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cbmltcG9ydCB7c2VuZE1lc3NhZ2UsIGxpc3Rlbn0gZnJvbSAnLi9wbHVnaW4tZ3Vlc3QuanMnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UnVucygpIHtcbiAgcmV0dXJuIHNlbmRNZXNzYWdlKCdleHBlcmltZW50YWwuR2V0UnVucycpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0T25SdW5zQ2hhbmdlZChjYWxsYmFjazogKHJ1bnM6IHN0cmluZ1tdKSA9PiB2b2lkIHwgdm9pZCkge1xuICByZXR1cm4gbGlzdGVuKCdleHBlcmltZW50YWwuUnVuc0NoYW5nZWQnLCBjYWxsYmFjayk7XG59XG4iXX0=