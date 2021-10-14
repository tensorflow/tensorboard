# Copyright 2021 The TensorFlow Authors. All Rights Reserved.
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
"""Supports TensorBoard.dev uploader by managing blob writes."""

import contextlib
import grpc
import time

from tensorboard.uploader.proto import write_service_pb2

from tensorboard.uploader import util
from tensorboard.uploader import uploader_errors
from tensorboard.util import grpc_util
from tensorboard.util import tb_logging
from tensorboard.util import tensor_util

logger = tb_logging.get_logger()


@contextlib.contextmanager
def _request_logger(request, runs=None):
    upload_start_time = time.time()
    request_bytes = request.ByteSize()
    logger.info("Trying request of %d bytes", request_bytes)
    yield
    upload_duration_secs = time.time() - upload_start_time
    if runs:
        logger.info(
            "Upload for %d runs (%d bytes) took %.3f seconds",
            len(runs),
            request_bytes,
            upload_duration_secs,
        )
    else:
        logger.info(
            "Upload of (%d bytes) took %.3f seconds",
            request_bytes,
            upload_duration_secs,
        )


class BlobRequestSender(object):
    """Uploader for blob-type event data.

    Analog to `TensorBatchedRequestSender` and `ScalarBatchedRequestSender`.

    Unlike the TensorBatchedRequestSender and ScalarBatchedRequestSender, this
    class does not accumulate events in batches; every blob is sent
    individually and immediately.  Nonetheless we retain the
    `add_event()`/`flush()` structure for symmetry.

    This class is not threadsafe. Use external synchronization if calling its
    methods concurrently.
    """

    def __init__(
        self,
        experiment_id,
        api,
        rpc_rate_limiter,
        max_blob_request_size,
        max_blob_size,
        tracker,
    ):
        if experiment_id is None:
            raise ValueError("experiment_id cannot be None")
        self._experiment_id = experiment_id
        self._api = api
        self._rpc_rate_limiter = rpc_rate_limiter
        self._max_blob_request_size = max_blob_request_size
        self._max_blob_size = max_blob_size
        self._tracker = tracker

        # Start in the empty state, just like self._new_request().
        self._run_name = None
        self._event = None
        self._value = None
        self._metadata = None

    def _new_request(self):
        """Declares the previous event complete."""
        self._run_name = None
        self._event = None
        self._value = None
        self._metadata = None

    def add_event(
        self,
        run_name,
        event,
        value,
        metadata,
    ):
        """Attempts to add the given event to the current request.

        If the event cannot be added to the current request because the byte
        budget is exhausted, the request is flushed, and the event is added
        to the next request.
        """
        if self._value:
            raise RuntimeError("Tried to send blob while another is pending")
        self._run_name = run_name
        self._event = event  # provides step and possibly plugin_name
        self._value = value
        # TODO(soergel): should we really unpack the tensor here, or ship
        # it wholesale and unpack server side, or something else?
        # TODO(soergel): can we extract the proto fields directly instead?
        self._blobs = tensor_util.make_ndarray(self._value.tensor)
        if self._blobs.ndim == 1:
            self._metadata = metadata
            self.flush()
        else:
            logger.warning(
                "A blob sequence must be represented as a rank-1 Tensor. "
                "Provided data has rank %d, for run %s, tag %s, step %s ('%s' plugin) .",
                self._blobs.ndim,
                run_name,
                self._value.tag,
                self._event.step,
                metadata.plugin_data.plugin_name,
            )
            # Skip this upload.
            self._new_request()

    def flush(self):
        """Sends the current blob sequence fully, and clears it to make way for the next."""
        if self._value:
            blob_sequence_id = self._get_or_create_blob_sequence()
            logger.info(
                "Sending %d blobs for sequence id: %s",
                len(self._blobs),
                blob_sequence_id,
            )

            sent_blobs = 0
            for seq_index, blob in enumerate(self._blobs):
                # Note the _send_blob() stream is internally flow-controlled.
                # This rate limit applies to *starting* the stream.
                self._rpc_rate_limiter.tick()
                with self._tracker.blob_tracker(len(blob)) as blob_tracker:
                    sent_blobs += self._send_blob(
                        blob_sequence_id, seq_index, blob
                    )
                    blob_tracker.mark_uploaded(bool(sent_blobs))

            logger.info(
                "Sent %d of %d blobs for sequence id: %s",
                sent_blobs,
                len(self._blobs),
                blob_sequence_id,
            )

        self._new_request()

    def _get_or_create_blob_sequence(self):
        request = write_service_pb2.GetOrCreateBlobSequenceRequest(
            experiment_id=self._experiment_id,
            run=self._run_name,
            tag=self._value.tag,
            step=self._event.step,
            final_sequence_length=len(self._blobs),
            metadata=self._metadata,
        )
        util.set_timestamp(request.wall_time, self._event.wall_time)
        with _request_logger(request):
            try:
                # TODO(@nfelt): execute this RPC asynchronously.
                response = grpc_util.call_with_retries(
                    self._api.GetOrCreateBlobSequence, request
                )
                blob_sequence_id = response.blob_sequence_id
            except grpc.RpcError as e:
                if e.code() == grpc.StatusCode.NOT_FOUND:
                    raise uploader_errors.ExperimentNotFoundError()
                logger.error("Upload call failed with error %s", e)
                # TODO(soergel): clean up
                raise

        return blob_sequence_id

    def _send_blob(self, blob_sequence_id, seq_index, blob):
        """Tries to send a single blob for a given index within a blob sequence.

        The blob will not be sent if it was sent already, or if it is too large.

        Returns:
          The number of blobs successfully sent (i.e., 1 or 0).
        """
        # TODO(soergel): retry and resume logic

        if len(blob) > self._max_blob_size:
            logger.warning(
                "Blob too large; skipping.  Size %d exceeds limit of %d bytes.",
                len(blob),
                self._max_blob_size,
            )
            return 0

        request_iterator = self._write_blob_request_iterator(
            blob_sequence_id, seq_index, blob
        )
        upload_start_time = time.time()
        count = 0
        # TODO(soergel): don't wait for responses for greater throughput
        # See https://stackoverflow.com/questions/55029342/handling-async-streaming-request-in-grpc-python
        try:
            for response in self._api.WriteBlob(request_iterator):
                count += 1
                # TODO(soergel): validate responses?  probably not.
                pass
            upload_duration_secs = time.time() - upload_start_time
            logger.info(
                "Upload for %d chunks totaling %d bytes took %.3f seconds (%.3f MB/sec)",
                count,
                len(blob),
                upload_duration_secs,
                len(blob) / upload_duration_secs / (1024 * 1024),
            )
            return 1
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.ALREADY_EXISTS:
                logger.error("Attempted to re-upload existing blob.  Skipping.")
                return 0
            else:
                logger.info("WriteBlob RPC call got error %s", e)
                raise

    def _write_blob_request_iterator(self, blob_sequence_id, seq_index, blob):
        # For now all use cases have the blob in memory already.
        # In the future we may want to stream from disk; that will require
        # refactoring here.
        # TODO(soergel): compute crc32c's to allow server-side data validation.
        for offset in range(0, len(blob), self._max_blob_request_size):
            chunk = blob[offset : offset + self._max_blob_request_size]
            finalize_object = offset + self._max_blob_request_size >= len(blob)
            request = write_service_pb2.WriteBlobRequest(
                blob_sequence_id=blob_sequence_id,
                index=seq_index,
                data=chunk,
                offset=offset,
                crc32c=None,
                finalize_object=finalize_object,
                final_crc32c=None,
                blob_bytes=len(blob),
            )
            yield request
