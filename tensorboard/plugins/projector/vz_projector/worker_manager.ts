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
namespace vz_projector {

  type CallbackMap<T> = { [key: number]: (error: Error|null, result: T) => void }
  export type WorkerMessage<T> = { data: [number, T] };
  export type WorkerResponse<T> = { data: [number, T, Error|null] };

  export class WorkerManager<MessageType, ResponseType> {
    private messageId = 0;
    private callbacks: CallbackMap<ResponseType> = {}

    constructor(public worker: Worker) {
      worker.addEventListener('message', (e) => {
        this.onMessage(e);
      });
    }

    onMessage(e) {
      const [messageId, result, error] = e.data;
      const callback = this.callbacks[messageId];
      
      if (!callback) {
        return;
      }

      delete this.callbacks[messageId];
      callback(error, result);
    }

    postMessage<T>(message: MessageType): Promise<ResponseType> {
      const messageId = this.messageId++;
      const messageToSend = [messageId, message];

      return new Promise((resolve, reject) => {
        this.callbacks[messageId] = (error: Error|null, result: ResponseType) => {
          if (error) {
            return reject(new Error(error.message));
          }
          resolve(result);
        }

        this.worker.postMessage(messageToSend);
      });
    }
  }

  export class UmapWorkerManager extends WorkerManager<UmapWorkerMessage, UmapWorkerResponse> {
    constructor(worker: Worker) {
      super(worker);
    }

    async create(nComponents: number, nNeighbors: number) {
      return await this.postMessage({ 
        type: 'UMAP_WORKER_CREATE', 
        payload: { nComponents, nNeighbors},
      }) as UmapWorkerCreateResponse;
    }

    async initializeFit(X: number[][], knnIndices: number[][], knnDistances: number[][]) {
      const response = await this.postMessage({ 
        type: 'UMAP_WORKER_INTIALIZE_FIT',
        payload: { X, knnDistances, knnIndices },
      })  as UmapWorkerInitializeFitResponse;
      return response.payload.nEpochs;
    }

    async getEmbedding() {
      const response = await this.postMessage({ 
        type: 'UMAP_WORKER_GET_EMBEDDING', 
      }) as UmapWorkerGetEmbeddingResponse;
      return response.payload.embedding;
    }

    async stepOptimize(nSteps = 1) {
      const response = await this.postMessage({ 
      type: 'UMAP_WORKER_STEP_OPTIMIZE', 
        payload: { nSteps }
      }) as UmapWorkerStepOptimizeResponse;
      return response.payload.currentEpoch;
    }
  }

}  // namespace vz_projector
