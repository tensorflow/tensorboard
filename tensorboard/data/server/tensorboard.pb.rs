/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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

/// Serialization format for histogram module in
/// tsl/lib/histogram/histogram.h
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct HistogramProto {
    #[prost(double, tag="1")]
    pub min: f64,
    #[prost(double, tag="2")]
    pub max: f64,
    #[prost(double, tag="3")]
    pub num: f64,
    #[prost(double, tag="4")]
    pub sum: f64,
    #[prost(double, tag="5")]
    pub sum_squares: f64,
    /// Parallel arrays encoding the bucket boundaries and the bucket values.
    /// bucket(i) is the count for the bucket i.  The range for
    /// a bucket is:
    ///   i == 0:  -DBL_MAX .. bucket_limit(0)
    ///   i != 0:  bucket_limit(i-1) .. bucket_limit(i)
    #[prost(double, repeated, tag="6")]
    pub bucket_limit: ::prost::alloc::vec::Vec<f64>,
    #[prost(double, repeated, tag="7")]
    pub bucket: ::prost::alloc::vec::Vec<f64>,
}
/// Dimensions of a tensor.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TensorShapeProto {
    /// Dimensions of the tensor, such as {"input", 30}, {"output", 40}
    /// for a 30 x 40 2D tensor.  If an entry has size -1, this
    /// corresponds to a dimension of unknown size. The names are
    /// optional.
    ///
    /// The order of entries in "dim" matters: It indicates the layout of the
    /// values in the tensor in-memory representation.
    ///
    /// The first entry in "dim" is the outermost dimension used to layout the
    /// values, the last entry is the innermost dimension.  This matches the
    /// in-memory layout of RowMajor Eigen tensors.
    ///
    /// If "dim.size()" > 0, "unknown_rank" must be false.
    #[prost(message, repeated, tag="2")]
    pub dim: ::prost::alloc::vec::Vec<tensor_shape_proto::Dim>,
    /// If true, the number of dimensions in the shape is unknown.
    ///
    /// If true, "dim.size()" must be 0.
    #[prost(bool, tag="3")]
    pub unknown_rank: bool,
}
/// Nested message and enum types in `TensorShapeProto`.
pub mod tensor_shape_proto {
    /// One dimension of the tensor.
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct Dim {
        /// Size of the tensor in that dimension.
        /// This value must be >= -1, but values of -1 are reserved for "unknown"
        /// shapes (values of -1 mean "unknown" dimension).  Certain wrappers
        /// that work with TensorShapeProto may fail at runtime when deserializing
        /// a TensorShapeProto containing a dim value of -1.
        #[prost(int64, tag="1")]
        pub size: i64,
        /// Optional name of the tensor dimension.
        #[prost(string, tag="2")]
        pub name: ::prost::alloc::string::String,
    }
}
/// Represents a serialized tf.dtypes.Dtype
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SerializedDType {
    #[prost(enumeration="DataType", tag="1")]
    pub datatype: i32,
}
/// (== suppress_warning documentation-presence ==)
/// DISABLED.IfChange
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
#[repr(i32)]
pub enum DataType {
    /// Not a legal value for DataType.  Used to indicate a DataType field
    /// has not been set.
    DtInvalid = 0,
    /// Data types that all computation devices are expected to be
    /// capable to support.
    DtFloat = 1,
    DtDouble = 2,
    DtInt32 = 3,
    DtUint8 = 4,
    DtInt16 = 5,
    DtInt8 = 6,
    DtString = 7,
    /// Single-precision complex
    DtComplex64 = 8,
    DtInt64 = 9,
    DtBool = 10,
    /// Quantized int8
    DtQint8 = 11,
    /// Quantized uint8
    DtQuint8 = 12,
    /// Quantized int32
    DtQint32 = 13,
    /// Float32 truncated to 16 bits.
    DtBfloat16 = 14,
    /// Quantized int16
    DtQint16 = 15,
    /// Quantized uint16
    DtQuint16 = 16,
    DtUint16 = 17,
    /// Double-precision complex
    DtComplex128 = 18,
    DtHalf = 19,
    DtResource = 20,
    /// Arbitrary C++ data types
    DtVariant = 21,
    DtUint32 = 22,
    DtUint64 = 23,
    /// 5 exponent bits, 2 mantissa bits.
    DtFloat8E5m2 = 24,
    /// 4 exponent bits, 3 mantissa bits, finite-only, with
    DtFloat8E4m3fn = 25,
    /// 2 NaNs (0bS1111111).
    ///
    /// 4 exponent bits, 3 mantissa bits, finite-only,
    DtFloat8E4m3fnuz = 26,
    /// with NaN.
    ///
    /// 4 exponent bits, 3 mantissa bits, 11 bits
    DtFloat8E4m3b11fnuz = 27,
    /// bias, finite-only, with NaNs.
    ///
    /// 5 exponent bits, 2 mantissa bits, finite-only,
    DtFloat8E5m2fnuz = 28,
    // with NaN.

    DtInt4 = 29,
    DtUint4 = 30,
    /// Do not use!  These are only for TF1's obsolete reference Variables.
    /// Every enum above should have a corresponding value below (verified by
    /// types_test).
    DtFloatRef = 101,
    DtDoubleRef = 102,
    DtInt32Ref = 103,
    DtUint8Ref = 104,
    DtInt16Ref = 105,
    DtInt8Ref = 106,
    DtStringRef = 107,
    DtComplex64Ref = 108,
    DtInt64Ref = 109,
    DtBoolRef = 110,
    DtQint8Ref = 111,
    DtQuint8Ref = 112,
    DtQint32Ref = 113,
    DtBfloat16Ref = 114,
    DtQint16Ref = 115,
    DtQuint16Ref = 116,
    DtUint16Ref = 117,
    DtComplex128Ref = 118,
    DtHalfRef = 119,
    DtResourceRef = 120,
    DtVariantRef = 121,
    DtUint32Ref = 122,
    DtUint64Ref = 123,
    DtFloat8E5m2Ref = 124,
    DtFloat8E4m3fnRef = 125,
    DtFloat8E4m3fnuzRef = 126,
    DtFloat8E4m3b11fnuzRef = 127,
    DtFloat8E5m2fnuzRef = 128,
    DtInt4Ref = 129,
    DtUint4Ref = 130,
}
/// Protocol buffer representing a handle to a tensorflow resource. Handles are
/// not valid across executions, but can be serialized back and forth from within
/// a single run.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ResourceHandleProto {
    /// Unique name for the device containing the resource.
    #[prost(string, tag="1")]
    pub device: ::prost::alloc::string::String,
    /// Container in which this resource is placed.
    #[prost(string, tag="2")]
    pub container: ::prost::alloc::string::String,
    /// Unique name of this resource.
    #[prost(string, tag="3")]
    pub name: ::prost::alloc::string::String,
    /// Hash code for the type of the resource. Is only valid in the same device
    /// and in the same execution.
    #[prost(uint64, tag="4")]
    pub hash_code: u64,
    /// For debug-only, the name of the type pointed to by this handle, if
    /// available.
    #[prost(string, tag="5")]
    pub maybe_type_name: ::prost::alloc::string::String,
    /// Data types and shapes for the underlying resource.
    #[prost(message, repeated, tag="6")]
    pub dtypes_and_shapes: ::prost::alloc::vec::Vec<resource_handle_proto::DtypeAndShape>,
}
/// Nested message and enum types in `ResourceHandleProto`.
pub mod resource_handle_proto {
    /// Protocol buffer representing a pair of (data type, tensor shape).
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct DtypeAndShape {
        /// Data type of the tensor.
        #[prost(enumeration="super::DataType", tag="1")]
        pub dtype: i32,
        /// Shape of the tensor.
        #[prost(message, optional, tag="2")]
        pub shape: ::core::option::Option<super::TensorShapeProto>,
    }
}
/// Protocol buffer representing a tensor.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TensorProto {
    /// Data type of the tensor.
    #[prost(enumeration="DataType", tag="1")]
    pub dtype: i32,
    /// Shape of the tensor.  TODO(touts): sort out the 0-rank issues.
    #[prost(message, optional, tag="2")]
    pub tensor_shape: ::core::option::Option<TensorShapeProto>,
    // Only one of the representations below is set, one of "tensor_contents" and
    // the "xxx_val" attributes.  We are not using oneof because as oneofs cannot
    // contain repeated fields it would require another extra set of messages.

    /// Version number.
    ///
    /// In version 0, if the "repeated xxx" representations contain only one
    /// element, that element is repeated to fill the shape.  This makes it easy
    /// to represent a constant Tensor with a single value.
    #[prost(int32, tag="3")]
    pub version_number: i32,
    /// Serialized raw tensor content from either Tensor::AsProtoTensorContent or
    /// memcpy in tensorflow::grpc::EncodeTensorToByteBuffer. This representation
    /// can be used for all tensor types. The purpose of this representation is to
    /// reduce serialization overhead during RPC call by avoiding serialization of
    /// many repeated small items.
    #[prost(bytes="bytes", tag="4")]
    pub tensor_content: ::prost::bytes::Bytes,
    // Type specific representations that make it easy to create tensor protos in
    // all languages.  Only the representation corresponding to "dtype" can
    // be set.  The values hold the flattened representation of the tensor in
    // row major order.

    /// DT_HALF, DT_BFLOAT16. Note that since protobuf has no int16 type, we'll
    /// have some pointless zero padding for each value here.
    #[prost(int32, repeated, tag="13")]
    pub half_val: ::prost::alloc::vec::Vec<i32>,
    /// DT_FLOAT.
    #[prost(float, repeated, tag="5")]
    pub float_val: ::prost::alloc::vec::Vec<f32>,
    /// DT_DOUBLE.
    #[prost(double, repeated, tag="6")]
    pub double_val: ::prost::alloc::vec::Vec<f64>,
    /// DT_INT32, DT_INT16, DT_UINT16, DT_INT8, DT_UINT8.
    #[prost(int32, repeated, tag="7")]
    pub int_val: ::prost::alloc::vec::Vec<i32>,
    /// DT_STRING
    #[prost(bytes="bytes", repeated, tag="8")]
    pub string_val: ::prost::alloc::vec::Vec<::prost::bytes::Bytes>,
    /// DT_COMPLEX64. scomplex_val(2*i) and scomplex_val(2*i+1) are real
    /// and imaginary parts of i-th single precision complex.
    #[prost(float, repeated, tag="9")]
    pub scomplex_val: ::prost::alloc::vec::Vec<f32>,
    /// DT_INT64
    #[prost(int64, repeated, tag="10")]
    pub int64_val: ::prost::alloc::vec::Vec<i64>,
    /// DT_BOOL
    #[prost(bool, repeated, tag="11")]
    pub bool_val: ::prost::alloc::vec::Vec<bool>,
    /// DT_COMPLEX128. dcomplex_val(2*i) and dcomplex_val(2*i+1) are real
    /// and imaginary parts of i-th double precision complex.
    #[prost(double, repeated, tag="12")]
    pub dcomplex_val: ::prost::alloc::vec::Vec<f64>,
    /// DT_RESOURCE
    #[prost(message, repeated, tag="14")]
    pub resource_handle_val: ::prost::alloc::vec::Vec<ResourceHandleProto>,
    /// DT_VARIANT
    #[prost(message, repeated, tag="15")]
    pub variant_val: ::prost::alloc::vec::Vec<VariantTensorDataProto>,
    /// DT_UINT32
    #[prost(uint32, repeated, tag="16")]
    pub uint32_val: ::prost::alloc::vec::Vec<u32>,
    /// DT_UINT64
    #[prost(uint64, repeated, tag="17")]
    pub uint64_val: ::prost::alloc::vec::Vec<u64>,
    /// DT_FLOAT8_*, use variable-sized set of bytes
    /// (i.e. the equivalent of repeated uint8, if such a thing existed).
    #[prost(bytes="bytes", tag="18")]
    pub float8_val: ::prost::bytes::Bytes,
}
/// Protocol buffer representing the serialization format of DT_VARIANT tensors.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct VariantTensorDataProto {
    /// Name of the type of objects being serialized.
    #[prost(string, tag="1")]
    pub type_name: ::prost::alloc::string::String,
    /// Portions of the object that are not Tensors.
    #[prost(bytes="bytes", tag="2")]
    pub metadata: ::prost::bytes::Bytes,
    /// Tensors contained within objects being serialized.
    #[prost(message, repeated, tag="3")]
    pub tensors: ::prost::alloc::vec::Vec<TensorProto>,
}
/// Metadata associated with a series of Summary data
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SummaryDescription {
    /// Hint on how plugins should process the data in this series.
    /// Supported values include "scalar", "histogram", "image", "audio"
    #[prost(string, tag="1")]
    pub type_hint: ::prost::alloc::string::String,
}
/// A SummaryMetadata encapsulates information on which plugins are able to make
/// use of a certain summary value.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SummaryMetadata {
    /// Data that associates a summary with a certain plugin.
    #[prost(message, optional, tag="1")]
    pub plugin_data: ::core::option::Option<summary_metadata::PluginData>,
    /// Display name for viewing in TensorBoard.
    #[prost(string, tag="2")]
    pub display_name: ::prost::alloc::string::String,
    /// Longform readable description of the summary sequence. Markdown supported.
    #[prost(string, tag="3")]
    pub summary_description: ::prost::alloc::string::String,
    /// Class of data stored in this time series. Required for compatibility with
    /// TensorBoard's generic data facilities (`DataProvider`, et al.). This value
    /// imposes constraints on the dtype and shape of the corresponding tensor
    /// values. See `DataClass` docs for details.
    #[prost(enumeration="DataClass", tag="4")]
    pub data_class: i32,
}
/// Nested message and enum types in `SummaryMetadata`.
pub mod summary_metadata {
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct PluginData {
        /// The name of the plugin this data pertains to.
        #[prost(string, tag="1")]
        pub plugin_name: ::prost::alloc::string::String,
        /// The content to store for the plugin. The best practice is for this to be
        /// a binary serialized protocol buffer.
        #[prost(bytes="bytes", tag="2")]
        pub content: ::prost::bytes::Bytes,
    }
}
/// A Summary is a set of named values to be displayed by the
/// visualizer.
///
/// Summaries are produced regularly during training, as controlled by
/// the "summary_interval_secs" attribute of the training operation.
/// Summaries are also produced at the end of an evaluation.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Summary {
    /// Set of values for the summary.
    #[prost(message, repeated, tag="1")]
    pub value: ::prost::alloc::vec::Vec<summary::Value>,
}
/// Nested message and enum types in `Summary`.
pub mod summary {
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct Image {
        /// Dimensions of the image.
        #[prost(int32, tag="1")]
        pub height: i32,
        #[prost(int32, tag="2")]
        pub width: i32,
        /// Valid colorspace values are
        ///   1 - grayscale
        ///   2 - grayscale + alpha
        ///   3 - RGB
        ///   4 - RGBA
        ///   5 - DIGITAL_YUV
        ///   6 - BGRA
        #[prost(int32, tag="3")]
        pub colorspace: i32,
        /// Image data in encoded format.  All image formats supported by
        /// image_codec::CoderUtil can be stored here.
        #[prost(bytes="bytes", tag="4")]
        pub encoded_image_string: ::prost::bytes::Bytes,
    }
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct Audio {
        /// Sample rate of the audio in Hz.
        #[prost(float, tag="1")]
        pub sample_rate: f32,
        /// Number of channels of audio.
        #[prost(int64, tag="2")]
        pub num_channels: i64,
        /// Length of the audio in frames (samples per channel).
        #[prost(int64, tag="3")]
        pub length_frames: i64,
        /// Encoded audio data and its associated RFC 2045 content type (e.g.
        /// "audio/wav").
        #[prost(bytes="bytes", tag="4")]
        pub encoded_audio_string: ::prost::bytes::Bytes,
        #[prost(string, tag="5")]
        pub content_type: ::prost::alloc::string::String,
    }
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct Value {
        /// This field is deprecated and will not be set.
        #[prost(string, tag="7")]
        pub node_name: ::prost::alloc::string::String,
        /// Tag name for the data. Used by TensorBoard plugins to organize data. Tags
        /// are often organized by scope (which contains slashes to convey
        /// hierarchy). For example: foo/bar/0
        #[prost(string, tag="1")]
        pub tag: ::prost::alloc::string::String,
        /// Contains metadata on the summary value such as which plugins may use it.
        /// Take note that many summary values may lack a metadata field. This is
        /// because the FileWriter only keeps a metadata object on the first summary
        /// value with a certain tag for each tag. TensorBoard then remembers which
        /// tags are associated with which plugins. This saves space.
        #[prost(message, optional, tag="9")]
        pub metadata: ::core::option::Option<super::SummaryMetadata>,
        /// Value associated with the tag.
        #[prost(oneof="value::Value", tags="2, 3, 4, 5, 6, 8")]
        pub value: ::core::option::Option<value::Value>,
    }
    /// Nested message and enum types in `Value`.
    pub mod value {
        /// Value associated with the tag.
        #[derive(Clone, PartialEq, ::prost::Oneof)]
        pub enum Value {
            #[prost(float, tag="2")]
            SimpleValue(f32),
            #[prost(bytes, tag="3")]
            ObsoleteOldStyleHistogram(::prost::bytes::Bytes),
            #[prost(message, tag="4")]
            Image(super::Image),
            #[prost(message, tag="5")]
            Histo(super::super::HistogramProto),
            #[prost(message, tag="6")]
            Audio(super::Audio),
            #[prost(message, tag="8")]
            Tensor(super::super::TensorProto),
        }
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
#[repr(i32)]
pub enum DataClass {
    /// Unknown data class, used (implicitly) for legacy data. Will not be
    /// processed by data ingestion pipelines.
    Unknown = 0,
    /// Scalar time series. Each `Value` for the corresponding tag must have
    /// `tensor` set to a rank-0 tensor of type `DT_FLOAT` (float32).
    Scalar = 1,
    /// Tensor time series. Each `Value` for the corresponding tag must have
    /// `tensor` set. The tensor value is arbitrary, but should be small to
    /// accommodate direct storage in database backends: an upper bound of a few
    /// kilobytes is a reasonable rule of thumb.
    Tensor = 2,
    /// Blob sequence time series. Each `Value` for the corresponding tag must
    /// have `tensor` set to a rank-1 tensor of bytestring dtype.
    BlobSequence = 3,
}
/// Protocol buffer representing an event that happened during
/// the execution of a Brain model.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Event {
    /// Timestamp of the event.
    #[prost(double, tag="1")]
    pub wall_time: f64,
    /// Global step of the event.
    #[prost(int64, tag="2")]
    pub step: i64,
    /// Information of the source that writes the events, this is only logged in
    /// the very first event along with the `file_version` field.
    #[prost(message, optional, tag="10")]
    pub source_metadata: ::core::option::Option<SourceMetadata>,
    #[prost(oneof="event::What", tags="3, 4, 5, 6, 7, 8, 9")]
    pub what: ::core::option::Option<event::What>,
}
/// Nested message and enum types in `Event`.
pub mod event {
    #[derive(Clone, PartialEq, ::prost::Oneof)]
    pub enum What {
        /// An event file was started, with the specified version.
        /// This is use to identify the contents of the record IO files
        /// easily.  Current version is "brain.Event:2".  All versions
        /// start with "brain.Event:".
        #[prost(string, tag="3")]
        FileVersion(::prost::alloc::string::String),
        /// An encoded version of a GraphDef.
        #[prost(bytes, tag="4")]
        GraphDef(::prost::bytes::Bytes),
        /// A summary was generated.
        #[prost(message, tag="5")]
        Summary(super::Summary),
        /// The user output a log message. This was theoretically used by the defunct
        /// tensorboard_logging module, which has since been removed; this field is
        /// now deprecated and should not be used.
        #[prost(message, tag="6")]
        LogMessage(super::LogMessage),
        /// The state of the session which can be used for restarting after crashes.
        #[prost(message, tag="7")]
        SessionLog(super::SessionLog),
        /// The metadata returned by running a session.run() call.
        #[prost(message, tag="8")]
        TaggedRunMetadata(super::TaggedRunMetadata),
        /// An encoded version of a MetaGraphDef.
        #[prost(bytes, tag="9")]
        MetaGraphDef(::prost::bytes::Bytes),
    }
}
/// Holds the information of the source that writes the events.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SourceMetadata {
    /// Low level name of the summary writer, such as
    /// `tensorflow.core.util.events_writer`.
    #[prost(string, tag="1")]
    pub writer: ::prost::alloc::string::String,
}
/// Protocol buffer used for logging messages to the events file.
///
/// This was theoretically used by the defunct tensorboard_logging module, which
/// has been removed; this message is now deprecated and should not be used.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct LogMessage {
    #[prost(enumeration="log_message::Level", tag="1")]
    pub level: i32,
    #[prost(string, tag="2")]
    pub message: ::prost::alloc::string::String,
}
/// Nested message and enum types in `LogMessage`.
pub mod log_message {
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
    #[repr(i32)]
    pub enum Level {
        Unknown = 0,
        /// Note: The logging level 10 cannot be named DEBUG. Some software
        /// projects compile their C/C++ code with -DDEBUG in debug builds. So the
        /// C++ code generated from this file should not have an identifier named
        /// DEBUG.
        Debugging = 10,
        Info = 20,
        Warn = 30,
        Error = 40,
        Fatal = 50,
    }
}
/// Protocol buffer used for logging session state.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct SessionLog {
    #[prost(enumeration="session_log::SessionStatus", tag="1")]
    pub status: i32,
    /// This checkpoint_path contains both the path and filename.
    #[prost(string, tag="2")]
    pub checkpoint_path: ::prost::alloc::string::String,
    #[prost(string, tag="3")]
    pub msg: ::prost::alloc::string::String,
}
/// Nested message and enum types in `SessionLog`.
pub mod session_log {
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
    #[repr(i32)]
    pub enum SessionStatus {
        StatusUnspecified = 0,
        Start = 1,
        Stop = 2,
        Checkpoint = 3,
    }
}
/// For logging the metadata output for a single session.run() call.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TaggedRunMetadata {
    /// Tag name associated with this metadata.
    #[prost(string, tag="1")]
    pub tag: ::prost::alloc::string::String,
    /// Byte-encoded version of the `RunMetadata` proto in order to allow lazy
    /// deserialization.
    #[prost(bytes="bytes", tag="2")]
    pub run_metadata: ::prost::bytes::Bytes,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct WatchdogConfig {
    #[prost(int64, tag="1")]
    pub timeout_ms: i64,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct RequestedExitCode {
    #[prost(int32, tag="1")]
    pub exit_code: i32,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct WorkerHeartbeatRequest {
    #[prost(enumeration="WorkerShutdownMode", tag="1")]
    pub shutdown_mode: i32,
    #[prost(message, optional, tag="2")]
    pub watchdog_config: ::core::option::Option<WatchdogConfig>,
    #[prost(message, optional, tag="3")]
    pub exit_code: ::core::option::Option<RequestedExitCode>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct WorkerHeartbeatResponse {
    #[prost(enumeration="WorkerHealth", tag="1")]
    pub health_status: i32,
    #[prost(message, repeated, tag="2")]
    pub worker_log: ::prost::alloc::vec::Vec<Event>,
    #[prost(string, tag="3")]
    pub hostname: ::prost::alloc::string::String,
}
// Worker heartbeat messages.  Support for these operations is currently
// internal and expected to change.

/// Current health status of a worker.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
#[repr(i32)]
pub enum WorkerHealth {
    /// By default a worker is healthy.
    Ok = 0,
    ReceivedShutdownSignal = 1,
    InternalError = 2,
    /// Worker has been instructed to shutdown after a timeout.
    ShuttingDown = 3,
}
/// Indicates the behavior of the worker when an internal error or shutdown
/// signal is received.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
#[repr(i32)]
pub enum WorkerShutdownMode {
    Default = 0,
    NotConfigured = 1,
    WaitForCoordinator = 2,
    ShutdownAfterTimeout = 3,
}
/// Audio summaries created by the `tensorboard.plugins.audio.summary`
/// module will include `SummaryMetadata` whose `plugin_data` field has
/// as `content` a binary string that is the encoding of an
/// `AudioPluginData` proto.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct AudioPluginData {
    /// Version `0` is the only supported version. It has the following
    /// semantics:
    ///
    ///   - If the tensor shape is rank-2, then `t[:, 0]` represent encoded
    ///     audio data, and `t[:, 1]` represent corresponding UTF-8 encoded
    ///     Markdown labels.
    ///   - If the tensor shape is rank-1, then `t\[:\]` represent encoded
    ///     audio data. There are no labels.
    #[prost(int32, tag="1")]
    pub version: i32,
    #[prost(enumeration="audio_plugin_data::Encoding", tag="2")]
    pub encoding: i32,
    /// Indicates whether this time series data was originally represented
    /// as `Summary.Value.Audio` values and has been automatically
    /// converted to bytestring tensors.
    #[prost(bool, tag="3")]
    pub converted_to_tensor: bool,
}
/// Nested message and enum types in `AudioPluginData`.
pub mod audio_plugin_data {
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
    #[repr(i32)]
    pub enum Encoding {
        /// Do not use `UNKNOWN`; it is only present because it must be.
        Unknown = 0,
        Wav = 11,
    }
}
/// Image summaries created by the `tensorboard.plugins.image.summary`
/// module will include `SummaryMetadata` whose `plugin_data` field has
/// as `content` a binary string that is the encoding of an
/// `ImagePluginData` proto.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ImagePluginData {
    /// Version `0` is the only supported version.
    #[prost(int32, tag="1")]
    pub version: i32,
    /// Indicates whether this time series data was originally represented
    /// as `Summary.Value.Image` values and has been automatically
    /// converted to bytestring tensors.
    #[prost(bool, tag="2")]
    pub converted_to_tensor: bool,
}
