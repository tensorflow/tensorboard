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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class IPC {
    constructor(port) {
        this.port = port;
        this.id = 0;
        this.responseWaits = new Map();
        this.listeners = new Map();
        this.port.addEventListener('message', (event) => this.onMessage(event));
    }
    listen(type, callback) {
        this.listeners.set(type, callback);
    }
    unlisten(type) {
        this.listeners.delete(type);
    }
    onMessage(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = JSON.parse(event.data);
            // Access fields via strings to prevent compilers from mangling messages.
            const type = message['type'];
            const id = message['id'];
            const payload = message['payload'];
            const error = message['error'];
            const isReply = message['isReply'];
            if (isReply) {
                if (!this.responseWaits.has(id))
                    return;
                const { resolve, reject } = this.responseWaits.get(id);
                this.responseWaits.delete(id);
                if (error) {
                    reject(new Error(error));
                }
                else {
                    resolve(payload);
                }
                return;
            }
            let replyPayload = null;
            let replyError = null;
            if (this.listeners.has(type)) {
                const callback = this.listeners.get(type);
                try {
                    const result = yield callback(payload);
                    replyPayload = result;
                }
                catch (e) {
                    replyError = e;
                }
            }
            const replyMessage = {
                'type': type,
                'id': id,
                'payload': replyPayload,
                'error': replyError,
                'isReply': true,
            };
            this.postMessage(replyMessage);
        });
    }
    postMessage(message) {
        this.port.postMessage(JSON.stringify(message));
    }
    sendMessage(type, payload) {
        const id = this.id++;
        const message = { 'type': type, 'id': id, 'payload': payload, 'error': null, 'isReply': false };
        this.postMessage(message);
        return new Promise((resolve, reject) => {
            this.responseWaits.set(id, { resolve, reject });
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3RlbnNvcmJvYXJkL2NvbXBvbmVudHMvZXhwZXJpbWVudGFsL3BsdWdpbl9saWIvbWVzc2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7OztnRkFhZ0Y7Ozs7Ozs7OztBQXFDaEYsTUFBTSxPQUFPLEdBQUc7SUFLZCxZQUFvQixJQUFpQjtRQUFqQixTQUFJLEdBQUosSUFBSSxDQUFhO1FBSjdCLE9BQUUsR0FBRyxDQUFDLENBQUM7UUFDRSxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUEyQixDQUFDO1FBQ25ELGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBZ0MsQ0FBQztRQUduRSxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBaUIsRUFBRSxRQUF5QjtRQUNqRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUFpQjtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRWEsU0FBUyxDQUFDLEtBQW1COztZQUN6QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQVksQ0FBQztZQUNsRCx5RUFBeUU7WUFDekUsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdCLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbkMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9CLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNuQyxJQUFJLE9BQU8sRUFBRTtnQkFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUFFLE9BQU87Z0JBQ3hDLE1BQU0sRUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFvQixDQUFDO2dCQUN4RSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDOUIsSUFBSSxLQUFLLEVBQUU7b0JBQ1QsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7aUJBQzFCO3FCQUFNO29CQUNMLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztpQkFDbEI7Z0JBQ0QsT0FBTzthQUNSO1lBRUQsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDO1lBQ3hCLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQztZQUN0QixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM1QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQW9CLENBQUM7Z0JBQzdELElBQUk7b0JBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ3ZDLFlBQVksR0FBRyxNQUFNLENBQUM7aUJBQ3ZCO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLFVBQVUsR0FBRyxDQUFDLENBQUM7aUJBQ2hCO2FBQ0Y7WUFDRCxNQUFNLFlBQVksR0FBWTtnQkFDNUIsTUFBTSxFQUFFLElBQUk7Z0JBQ1osSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsU0FBUyxFQUFFLFlBQVk7Z0JBQ3ZCLE9BQU8sRUFBRSxVQUFVO2dCQUNuQixTQUFTLEVBQUUsSUFBSTthQUNoQixDQUFDO1lBQ0YsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNqQyxDQUFDO0tBQUE7SUFFTyxXQUFXLENBQUMsT0FBZ0I7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRCxXQUFXLENBQUMsSUFBaUIsRUFBRSxPQUFvQjtRQUNqRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDckIsTUFBTSxPQUFPLEdBQVksRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUMsQ0FBQztRQUN2RyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFDaEQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBDb3B5cmlnaHQgMjAxOSBUaGUgVGVuc29yRmxvdyBBdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuXG5MaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xueW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG5cbiAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcblxuVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG5TZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG5saW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG5cbi8qKlxuICogQXMgYSBwbHVnaW4gbGlicmFyeSwgdGhpcyBmaWxlIGlzIHByb3ZpZGVkIGFzLWlzIChFUyBtb2R1bGUpLlxuICpcbiAqIEFzIGEgdXRpbGl0eSBmb3IgVGVuc29yQm9hcmQncyBtYWluIGZyYW1lLCBpdCBpcyB3cmFwcGVkIHdpdGggbmFtZXNwYWNlOlxuICogXCJ0Yl9wbHVnaW4ubGliLkRPX05PVF9VU0VfSU5URVJOQUxcIi4gU2VlIHRoZSBCVUlMRCBmb3IgZGV0YWlscy5cbiAqL1xuXG5leHBvcnQgdHlwZSBQYXlsb2FkVHlwZSA9XG4gIHwgbnVsbFxuICB8IHVuZGVmaW5lZFxuICB8IHN0cmluZ1xuICB8IHN0cmluZ1tdXG4gIHwgYm9vbGVhblxuICB8IGJvb2xlYW5bXVxuICB8IG51bWJlclxuICB8IG51bWJlcltdXG4gIHwgb2JqZWN0XG4gIHwgb2JqZWN0W107XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVzc2FnZSB7XG4gIHR5cGU6IHN0cmluZztcbiAgaWQ6IG51bWJlcjtcbiAgcGF5bG9hZDogUGF5bG9hZFR5cGU7XG4gIGVycm9yOiBzdHJpbmcgfCBudWxsO1xuICBpc1JlcGx5OiBib29sZWFuO1xufVxuXG5leHBvcnQgdHlwZSBNZXNzYWdlVHlwZSA9IHN0cmluZztcbmV4cG9ydCB0eXBlIE1lc3NhZ2VDYWxsYmFjayA9IChwYXlsb2FkOiBhbnkpID0+IGFueTtcblxuaW50ZXJmYWNlIFByb21pc2VSZXNvbHZlciB7XG4gIHJlc29sdmU6IChkYXRhOiBhbnkpID0+IHZvaWQ7XG4gIHJlamVjdDogKGVycm9yOiBFcnJvcikgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGNsYXNzIElQQyB7XG4gIHByaXZhdGUgaWQgPSAwO1xuICBwcml2YXRlIHJlYWRvbmx5IHJlc3BvbnNlV2FpdHMgPSBuZXcgTWFwPG51bWJlciwgUHJvbWlzZVJlc29sdmVyPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGxpc3RlbmVycyA9IG5ldyBNYXA8TWVzc2FnZVR5cGUsIE1lc3NhZ2VDYWxsYmFjaz4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHBvcnQ6IE1lc3NhZ2VQb3J0KSB7XG4gICAgdGhpcy5wb3J0LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAoZXZlbnQpID0+IHRoaXMub25NZXNzYWdlKGV2ZW50KSk7XG4gIH1cblxuICBsaXN0ZW4odHlwZTogTWVzc2FnZVR5cGUsIGNhbGxiYWNrOiBNZXNzYWdlQ2FsbGJhY2spIHtcbiAgICB0aGlzLmxpc3RlbmVycy5zZXQodHlwZSwgY2FsbGJhY2spO1xuICB9XG5cbiAgdW5saXN0ZW4odHlwZTogTWVzc2FnZVR5cGUpIHtcbiAgICB0aGlzLmxpc3RlbmVycy5kZWxldGUodHlwZSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG9uTWVzc2FnZShldmVudDogTWVzc2FnZUV2ZW50KSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSkgYXMgTWVzc2FnZTtcbiAgICAvLyBBY2Nlc3MgZmllbGRzIHZpYSBzdHJpbmdzIHRvIHByZXZlbnQgY29tcGlsZXJzIGZyb20gbWFuZ2xpbmcgbWVzc2FnZXMuXG4gICAgY29uc3QgdHlwZSA9IG1lc3NhZ2VbJ3R5cGUnXTtcbiAgICBjb25zdCBpZCA9IG1lc3NhZ2VbJ2lkJ107XG4gICAgY29uc3QgcGF5bG9hZCA9IG1lc3NhZ2VbJ3BheWxvYWQnXTtcbiAgICBjb25zdCBlcnJvciA9IG1lc3NhZ2VbJ2Vycm9yJ107XG4gICAgY29uc3QgaXNSZXBseSA9IG1lc3NhZ2VbJ2lzUmVwbHknXTtcbiAgICBpZiAoaXNSZXBseSkge1xuICAgICAgaWYgKCF0aGlzLnJlc3BvbnNlV2FpdHMuaGFzKGlkKSkgcmV0dXJuO1xuICAgICAgY29uc3Qge3Jlc29sdmUsIHJlamVjdH0gPSB0aGlzLnJlc3BvbnNlV2FpdHMuZ2V0KGlkKSBhcyBQcm9taXNlUmVzb2x2ZXI7XG4gICAgICB0aGlzLnJlc3BvbnNlV2FpdHMuZGVsZXRlKGlkKTtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICByZWplY3QobmV3IEVycm9yKGVycm9yKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKHBheWxvYWQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCByZXBseVBheWxvYWQgPSBudWxsO1xuICAgIGxldCByZXBseUVycm9yID0gbnVsbDtcbiAgICBpZiAodGhpcy5saXN0ZW5lcnMuaGFzKHR5cGUpKSB7XG4gICAgICBjb25zdCBjYWxsYmFjayA9IHRoaXMubGlzdGVuZXJzLmdldCh0eXBlKSBhcyBNZXNzYWdlQ2FsbGJhY2s7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjYWxsYmFjayhwYXlsb2FkKTtcbiAgICAgICAgcmVwbHlQYXlsb2FkID0gcmVzdWx0O1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXBseUVycm9yID0gZTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgcmVwbHlNZXNzYWdlOiBNZXNzYWdlID0ge1xuICAgICAgJ3R5cGUnOiB0eXBlLFxuICAgICAgJ2lkJzogaWQsXG4gICAgICAncGF5bG9hZCc6IHJlcGx5UGF5bG9hZCxcbiAgICAgICdlcnJvcic6IHJlcGx5RXJyb3IsXG4gICAgICAnaXNSZXBseSc6IHRydWUsXG4gICAgfTtcbiAgICB0aGlzLnBvc3RNZXNzYWdlKHJlcGx5TWVzc2FnZSk7XG4gIH1cblxuICBwcml2YXRlIHBvc3RNZXNzYWdlKG1lc3NhZ2U6IE1lc3NhZ2UpIHtcbiAgICB0aGlzLnBvcnQucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkpO1xuICB9XG5cbiAgc2VuZE1lc3NhZ2UodHlwZTogTWVzc2FnZVR5cGUsIHBheWxvYWQ6IFBheWxvYWRUeXBlKTogUHJvbWlzZTxQYXlsb2FkVHlwZT4ge1xuICAgIGNvbnN0IGlkID0gdGhpcy5pZCsrO1xuICAgIGNvbnN0IG1lc3NhZ2U6IE1lc3NhZ2UgPSB7J3R5cGUnOiB0eXBlLCAnaWQnOiBpZCwgJ3BheWxvYWQnOiBwYXlsb2FkLCAnZXJyb3InOiBudWxsLCAnaXNSZXBseSc6IGZhbHNlfTtcbiAgICB0aGlzLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnJlc3BvbnNlV2FpdHMuc2V0KGlkLCB7cmVzb2x2ZSwgcmVqZWN0fSk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==