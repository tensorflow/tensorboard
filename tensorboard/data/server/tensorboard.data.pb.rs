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

#[derive(Clone, PartialEq, ::prost::Message)]
pub struct GetExperimentRequest {
    #[prost(string, tag="1")]
    pub experiment_id: ::prost::alloc::string::String,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct GetExperimentResponse {
    /// Human-readable description of the data source.
    ///
    /// This might be an absolute path on disk to a log directory of event files,
    /// a relative path, a URL to a cloud storage bucket, an address for a local
    /// socket server, etc. There does not need to be any way to "dereference" this
    /// address to read the original data directly.
    #[prost(string, tag="1")]
    pub data_location: ::prost::alloc::string::String,
    /// User-facing experiment name.
    ///
    /// This name is typically set by a user explicitly or automatically set by a
    /// training system.
    #[prost(string, tag="2")]
    pub name: ::prost::alloc::string::String,
    /// User-facing experiment description.
    #[prost(string, tag="3")]
    pub description: ::prost::alloc::string::String,
    /// Time that the experiment was created.
    ///
    /// This does not necessarily have any relation to times of events within an
    /// experiment. A new experiment may contain old data, or data may be freshly
    /// written to an experiment after it is created.
    ///
    /// May be unset if no creation time is known.
    #[prost(message, optional, tag="4")]
    pub creation_time: ::core::option::Option<::prost_types::Timestamp>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct PluginFilter {
    /// Only match data with exactly this plugin name.
    #[prost(string, tag="1")]
    pub plugin_name: ::prost::alloc::string::String,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct RunTagFilter {
    /// Optional filter for runs. If omitted, *all* runs match; this is not
    /// equivalent to an empty submessage (which matches no tags).
    #[prost(message, optional, tag="1")]
    pub runs: ::core::option::Option<RunFilter>,
    /// Optional filter for tags. If omitted, *all* tags match; this is not
    /// equivalent to an empty submessage (which matches no tags).
    #[prost(message, optional, tag="2")]
    pub tags: ::core::option::Option<TagFilter>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct RunFilter {
    /// Only match runs with exactly one of these names. In particular, if this
    /// list is empty, no runs match.
    #[prost(string, repeated, tag="1")]
    pub names: ::prost::alloc::vec::Vec<::prost::alloc::string::String>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TagFilter {
    /// Only match tags with exactly one of these names. In particular, if this
    /// list is empty, no tags match.
    #[prost(string, repeated, tag="1")]
    pub names: ::prost::alloc::vec::Vec<::prost::alloc::string::String>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Downsample {
    /// Maximum number of points to return. Must be non-negative. Zero means zero.
    #[prost(int64, tag="1")]
    pub num_points: i64,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ListPluginsRequest {
    /// ID of experiment in which to query data.
    #[prost(string, tag="1")]
    pub experiment_id: ::prost::alloc::string::String,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ListPluginsResponse {
    /// List of active plugins: i.e., plugins that have data.
    #[prost(message, repeated, tag="1")]
    pub plugins: ::prost::alloc::vec::Vec<Plugin>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Plugin {
    /// Plugin name, as listed in the `PluginData.plugin_name` field of a
    /// `SummaryMetadata` value.
    #[prost(string, tag="1")]
    pub name: ::prost::alloc::string::String,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ListRunsRequest {
    /// ID of experiment in which to query data.
    #[prost(string, tag="1")]
    pub experiment_id: ::prost::alloc::string::String,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ListRunsResponse {
    #[prost(message, repeated, tag="1")]
    pub runs: ::prost::alloc::vec::Vec<Run>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct Run {
    /// User-facing name.
    #[prost(string, tag="2")]
    pub name: ::prost::alloc::string::String,
    /// Wall time of earliest recorded event, as floating-point seconds since
    /// epoch (same as event file format).
    #[prost(double, tag="3")]
    pub start_time: f64,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ListScalarsRequest {
    /// ID of experiment in which to query data.
    #[prost(string, tag="1")]
    pub experiment_id: ::prost::alloc::string::String,
    /// Filter for the plugin that owns the scalars. It is an error if
    /// `plugin_filter.plugin_name` is the empty string.
    #[prost(message, optional, tag="2")]
    pub plugin_filter: ::core::option::Option<PluginFilter>,
    /// Optional filter for time series. If omitted, all time series match.
    #[prost(message, optional, tag="3")]
    pub run_tag_filter: ::core::option::Option<RunTagFilter>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ListScalarsResponse {
    #[prost(message, repeated, tag="1")]
    pub runs: ::prost::alloc::vec::Vec<list_scalars_response::RunEntry>,
}
/// Nested message and enum types in `ListScalarsResponse`.
pub mod list_scalars_response {
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct RunEntry {
        #[prost(string, tag="1")]
        pub run_name: ::prost::alloc::string::String,
        #[prost(message, repeated, tag="2")]
        pub tags: ::prost::alloc::vec::Vec<TagEntry>,
    }
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct TagEntry {
        #[prost(string, tag="1")]
        pub tag_name: ::prost::alloc::string::String,
        #[prost(message, optional, tag="2")]
        pub metadata: ::core::option::Option<super::ScalarMetadata>,
    }
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ScalarMetadata {
    /// Largest step value of any datum in this time series.
    #[prost(int64, tag="1")]
    pub max_step: i64,
    /// Largest wall time of any datum in this time series.
    #[prost(double, tag="2")]
    pub max_wall_time: f64,
    /// Atemporal summary metadata for this time series.
    #[prost(message, optional, tag="3")]
    pub summary_metadata: ::core::option::Option<super::SummaryMetadata>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ReadScalarsRequest {
    /// ID of experiment in which to query data.
    #[prost(string, tag="1")]
    pub experiment_id: ::prost::alloc::string::String,
    /// Filter for the plugin that owns the scalars. It is an error if
    /// `plugin_filter.plugin_name` is the empty string.
    #[prost(message, optional, tag="2")]
    pub plugin_filter: ::core::option::Option<PluginFilter>,
    /// Optional filter for time series. If omitted, all time series match.
    #[prost(message, optional, tag="3")]
    pub run_tag_filter: ::core::option::Option<RunTagFilter>,
    /// Required downsampling specification describing how many points to return
    /// per time series.
    #[prost(message, optional, tag="4")]
    pub downsample: ::core::option::Option<Downsample>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ReadScalarsResponse {
    #[prost(message, repeated, tag="1")]
    pub runs: ::prost::alloc::vec::Vec<read_scalars_response::RunEntry>,
}
/// Nested message and enum types in `ReadScalarsResponse`.
pub mod read_scalars_response {
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct RunEntry {
        #[prost(string, tag="1")]
        pub run_name: ::prost::alloc::string::String,
        #[prost(message, repeated, tag="2")]
        pub tags: ::prost::alloc::vec::Vec<TagEntry>,
    }
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct TagEntry {
        #[prost(string, tag="1")]
        pub tag_name: ::prost::alloc::string::String,
        #[prost(message, optional, tag="2")]
        pub data: ::core::option::Option<super::ScalarData>,
    }
}
/// A column-major sequence of scalar points. Arrays `step`, `wall_time`, and
/// `value` have the same lengths.
///
/// These are repeated primitive values, so they will be packed on the wire:
/// <<https://developers.google.com/protocol-buffers/docs/encoding#packed>>
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ScalarData {
    #[prost(int64, repeated, tag="1")]
    pub step: ::prost::alloc::vec::Vec<i64>,
    #[prost(double, repeated, tag="2")]
    pub wall_time: ::prost::alloc::vec::Vec<f64>,
    #[prost(float, repeated, tag="3")]
    pub value: ::prost::alloc::vec::Vec<f32>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ListTensorsRequest {
    /// ID of experiment in which to query data.
    #[prost(string, tag="1")]
    pub experiment_id: ::prost::alloc::string::String,
    /// Filter for the plugin that owns the tensors. It is an error if
    /// `plugin_filter.plugin_name` is the empty string.
    #[prost(message, optional, tag="2")]
    pub plugin_filter: ::core::option::Option<PluginFilter>,
    /// Optional filter for time series. If omitted, all time series match.
    #[prost(message, optional, tag="3")]
    pub run_tag_filter: ::core::option::Option<RunTagFilter>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ListTensorsResponse {
    #[prost(message, repeated, tag="1")]
    pub runs: ::prost::alloc::vec::Vec<list_tensors_response::RunEntry>,
}
/// Nested message and enum types in `ListTensorsResponse`.
pub mod list_tensors_response {
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct RunEntry {
        #[prost(string, tag="1")]
        pub run_name: ::prost::alloc::string::String,
        #[prost(message, repeated, tag="2")]
        pub tags: ::prost::alloc::vec::Vec<TagEntry>,
    }
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct TagEntry {
        #[prost(string, tag="1")]
        pub tag_name: ::prost::alloc::string::String,
        #[prost(message, optional, tag="2")]
        pub metadata: ::core::option::Option<super::TensorMetadata>,
    }
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TensorMetadata {
    /// Largest step value of any datum in this time series.
    #[prost(int64, tag="1")]
    pub max_step: i64,
    /// Largest wall time of any datum in this time series.
    #[prost(double, tag="2")]
    pub max_wall_time: f64,
    /// Atemporal summary metadata for this time series.
    #[prost(message, optional, tag="3")]
    pub summary_metadata: ::core::option::Option<super::SummaryMetadata>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ReadTensorsRequest {
    /// ID of experiment in which to query data.
    #[prost(string, tag="1")]
    pub experiment_id: ::prost::alloc::string::String,
    /// Filter for the plugin that owns the tensors. It is an error if
    /// `plugin_filter.plugin_name` is the empty string.
    #[prost(message, optional, tag="2")]
    pub plugin_filter: ::core::option::Option<PluginFilter>,
    /// Optional filter for time series. If omitted, all time series match.
    #[prost(message, optional, tag="3")]
    pub run_tag_filter: ::core::option::Option<RunTagFilter>,
    /// Required downsampling specification describing how many points to return
    /// per time series.
    #[prost(message, optional, tag="4")]
    pub downsample: ::core::option::Option<Downsample>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ReadTensorsResponse {
    #[prost(message, repeated, tag="1")]
    pub runs: ::prost::alloc::vec::Vec<read_tensors_response::RunEntry>,
}
/// Nested message and enum types in `ReadTensorsResponse`.
pub mod read_tensors_response {
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct RunEntry {
        #[prost(string, tag="1")]
        pub run_name: ::prost::alloc::string::String,
        #[prost(message, repeated, tag="2")]
        pub tags: ::prost::alloc::vec::Vec<TagEntry>,
    }
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct TagEntry {
        #[prost(string, tag="1")]
        pub tag_name: ::prost::alloc::string::String,
        #[prost(message, optional, tag="2")]
        pub data: ::core::option::Option<super::TensorData>,
    }
}
/// A column-major sequence of tensor points. Arrays `step`, `wall_time`, and
/// `value` have the same lengths.
///
/// The `step` and `wall_time` fields are repeated primitive values, so they
/// will be packed on the wire:
/// <<https://developers.google.com/protocol-buffers/docs/encoding#packed>>
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct TensorData {
    #[prost(int64, repeated, tag="1")]
    pub step: ::prost::alloc::vec::Vec<i64>,
    #[prost(double, repeated, tag="2")]
    pub wall_time: ::prost::alloc::vec::Vec<f64>,
    #[prost(message, repeated, tag="3")]
    pub value: ::prost::alloc::vec::Vec<super::TensorProto>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ListBlobSequencesRequest {
    /// ID of experiment in which to query data.
    #[prost(string, tag="1")]
    pub experiment_id: ::prost::alloc::string::String,
    /// Filter for the plugin that owns the blob sequences. It is an error if
    /// `plugin_filter.plugin_name` is the empty string.
    #[prost(message, optional, tag="2")]
    pub plugin_filter: ::core::option::Option<PluginFilter>,
    /// Optional filter for time series. If omitted, all time series match.
    #[prost(message, optional, tag="3")]
    pub run_tag_filter: ::core::option::Option<RunTagFilter>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ListBlobSequencesResponse {
    #[prost(message, repeated, tag="1")]
    pub runs: ::prost::alloc::vec::Vec<list_blob_sequences_response::RunEntry>,
}
/// Nested message and enum types in `ListBlobSequencesResponse`.
pub mod list_blob_sequences_response {
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct RunEntry {
        #[prost(string, tag="1")]
        pub run_name: ::prost::alloc::string::String,
        #[prost(message, repeated, tag="2")]
        pub tags: ::prost::alloc::vec::Vec<TagEntry>,
    }
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct TagEntry {
        #[prost(string, tag="1")]
        pub tag_name: ::prost::alloc::string::String,
        #[prost(message, optional, tag="2")]
        pub metadata: ::core::option::Option<super::BlobSequenceMetadata>,
    }
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct BlobSequenceMetadata {
    /// Largest step value of any datum in this time series.
    #[prost(int64, tag="1")]
    pub max_step: i64,
    /// Largest wall time of any datum in this time series.
    #[prost(double, tag="2")]
    pub max_wall_time: f64,
    /// Largest number of blobs in any datum in this time series.
    #[prost(int64, tag="3")]
    pub max_length: i64,
    /// Atemporal summary metadata for this time series.
    #[prost(message, optional, tag="4")]
    pub summary_metadata: ::core::option::Option<super::SummaryMetadata>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ReadBlobSequencesRequest {
    /// ID of experiment in which to query data.
    #[prost(string, tag="1")]
    pub experiment_id: ::prost::alloc::string::String,
    /// Filter for the plugin that owns the blob sequences. It is an error if
    /// `plugin_filter.plugin_name` is the empty string.
    #[prost(message, optional, tag="2")]
    pub plugin_filter: ::core::option::Option<PluginFilter>,
    /// Optional filter for time series. If omitted, all time series match.
    #[prost(message, optional, tag="3")]
    pub run_tag_filter: ::core::option::Option<RunTagFilter>,
    /// Required downsampling specification describing how many points to return
    /// per time series.
    #[prost(message, optional, tag="4")]
    pub downsample: ::core::option::Option<Downsample>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ReadBlobSequencesResponse {
    #[prost(message, repeated, tag="1")]
    pub runs: ::prost::alloc::vec::Vec<read_blob_sequences_response::RunEntry>,
}
/// Nested message and enum types in `ReadBlobSequencesResponse`.
pub mod read_blob_sequences_response {
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct RunEntry {
        #[prost(string, tag="1")]
        pub run_name: ::prost::alloc::string::String,
        #[prost(message, repeated, tag="2")]
        pub tags: ::prost::alloc::vec::Vec<TagEntry>,
    }
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct TagEntry {
        #[prost(string, tag="1")]
        pub tag_name: ::prost::alloc::string::String,
        #[prost(message, optional, tag="2")]
        pub data: ::core::option::Option<super::BlobSequenceData>,
    }
}
/// A column-major sequence of blob sequence points. Arrays `step`, `wall_time`,
/// and `value` have the same lengths.
///
/// The `step` and `wall_time` fields are repeated primitive values, so they
/// will be packed on the wire:
/// <<https://developers.google.com/protocol-buffers/docs/encoding#packed>>
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct BlobSequenceData {
    #[prost(int64, repeated, tag="1")]
    pub step: ::prost::alloc::vec::Vec<i64>,
    #[prost(double, repeated, tag="2")]
    pub wall_time: ::prost::alloc::vec::Vec<f64>,
    #[prost(message, repeated, tag="3")]
    pub values: ::prost::alloc::vec::Vec<BlobReferenceSequence>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct BlobReferenceSequence {
    #[prost(message, repeated, tag="1")]
    pub blob_refs: ::prost::alloc::vec::Vec<BlobReference>,
}
/// A reference to a blob.
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct BlobReference {
    /// Unique identifier for a blob, which may be dereferenced via the `ReadBlob`
    /// RPC. Must be suitable for inclusion directly in a URL with no further
    /// encoding. Case-sensitive. Required; the empty string is not a valid key.
    #[prost(string, tag="1")]
    pub blob_key: ::prost::alloc::string::String,
    /// Optional URL from which the blob may be fetched directly, bypassing the
    /// data provider interface.
    #[prost(string, tag="2")]
    pub url: ::prost::alloc::string::String,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ReadBlobRequest {
    #[prost(string, tag="1")]
    pub blob_key: ::prost::alloc::string::String,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ReadBlobResponse {
    /// The bytes in this chunk. Should be concatenated with any other responses
    /// in the stream to recover the full blob contents.
    #[prost(bytes="bytes", tag="1")]
    pub data: ::prost::bytes::Bytes,
}
# [doc = r" Generated client implementations."] pub mod tensor_board_data_provider_client { # ! [allow (unused_variables , dead_code , missing_docs , clippy :: let_unit_value ,)] use tonic :: codegen :: * ; # [derive (Debug , Clone)] pub struct TensorBoardDataProviderClient < T > { inner : tonic :: client :: Grpc < T > , } impl TensorBoardDataProviderClient < tonic :: transport :: Channel > { # [doc = r" Attempt to create a new client by connecting to a given endpoint."] pub async fn connect < D > (dst : D) -> Result < Self , tonic :: transport :: Error > where D : std :: convert :: TryInto < tonic :: transport :: Endpoint > , D :: Error : Into < StdError > , { let conn = tonic :: transport :: Endpoint :: new (dst) ? . connect () . await ? ; Ok (Self :: new (conn)) } } impl < T > TensorBoardDataProviderClient < T > where T : tonic :: client :: GrpcService < tonic :: body :: BoxBody > , T :: ResponseBody : Body + Send + 'static , T :: Error : Into < StdError > , < T :: ResponseBody as Body > :: Error : Into < StdError > + Send , { pub fn new (inner : T) -> Self { let inner = tonic :: client :: Grpc :: new (inner) ; Self { inner } } pub fn with_interceptor < F > (inner : T , interceptor : F) -> TensorBoardDataProviderClient < InterceptedService < T , F >> where F : tonic :: service :: Interceptor , T : tonic :: codegen :: Service < http :: Request < tonic :: body :: BoxBody > , Response = http :: Response << T as tonic :: client :: GrpcService < tonic :: body :: BoxBody >> :: ResponseBody > > , < T as tonic :: codegen :: Service < http :: Request < tonic :: body :: BoxBody >> > :: Error : Into < StdError > + Send + Sync , { TensorBoardDataProviderClient :: new (InterceptedService :: new (inner , interceptor)) } # [doc = r" Compress requests with `gzip`."] # [doc = r""] # [doc = r" This requires the server to support it otherwise it might respond with an"] # [doc = r" error."] pub fn send_gzip (mut self) -> Self { self . inner = self . inner . send_gzip () ; self } # [doc = r" Enable decompressing responses with `gzip`."] pub fn accept_gzip (mut self) -> Self { self . inner = self . inner . accept_gzip () ; self } # [doc = " Get metadata about an experiment."] pub async fn get_experiment (& mut self , request : impl tonic :: IntoRequest < super :: GetExperimentRequest > ,) -> Result < tonic :: Response < super :: GetExperimentResponse > , tonic :: Status > { self . inner . ready () . await . map_err (| e | { tonic :: Status :: new (tonic :: Code :: Unknown , format ! ("Service was not ready: {}" , e . into ())) }) ? ; let codec = tonic :: codec :: ProstCodec :: default () ; let path = http :: uri :: PathAndQuery :: from_static ("/tensorboard.data.TensorBoardDataProvider/GetExperiment") ; self . inner . unary (request . into_request () , path , codec) . await } # [doc = " List plugins that have data for an experiment."] pub async fn list_plugins (& mut self , request : impl tonic :: IntoRequest < super :: ListPluginsRequest > ,) -> Result < tonic :: Response < super :: ListPluginsResponse > , tonic :: Status > { self . inner . ready () . await . map_err (| e | { tonic :: Status :: new (tonic :: Code :: Unknown , format ! ("Service was not ready: {}" , e . into ())) }) ? ; let codec = tonic :: codec :: ProstCodec :: default () ; let path = http :: uri :: PathAndQuery :: from_static ("/tensorboard.data.TensorBoardDataProvider/ListPlugins") ; self . inner . unary (request . into_request () , path , codec) . await } # [doc = " List runs within an experiment."] pub async fn list_runs (& mut self , request : impl tonic :: IntoRequest < super :: ListRunsRequest > ,) -> Result < tonic :: Response < super :: ListRunsResponse > , tonic :: Status > { self . inner . ready () . await . map_err (| e | { tonic :: Status :: new (tonic :: Code :: Unknown , format ! ("Service was not ready: {}" , e . into ())) }) ? ; let codec = tonic :: codec :: ProstCodec :: default () ; let path = http :: uri :: PathAndQuery :: from_static ("/tensorboard.data.TensorBoardDataProvider/ListRuns") ; self . inner . unary (request . into_request () , path , codec) . await } # [doc = " List metadata about scalar time series."] pub async fn list_scalars (& mut self , request : impl tonic :: IntoRequest < super :: ListScalarsRequest > ,) -> Result < tonic :: Response < super :: ListScalarsResponse > , tonic :: Status > { self . inner . ready () . await . map_err (| e | { tonic :: Status :: new (tonic :: Code :: Unknown , format ! ("Service was not ready: {}" , e . into ())) }) ? ; let codec = tonic :: codec :: ProstCodec :: default () ; let path = http :: uri :: PathAndQuery :: from_static ("/tensorboard.data.TensorBoardDataProvider/ListScalars") ; self . inner . unary (request . into_request () , path , codec) . await } # [doc = " Read data from scalar time series."] pub async fn read_scalars (& mut self , request : impl tonic :: IntoRequest < super :: ReadScalarsRequest > ,) -> Result < tonic :: Response < super :: ReadScalarsResponse > , tonic :: Status > { self . inner . ready () . await . map_err (| e | { tonic :: Status :: new (tonic :: Code :: Unknown , format ! ("Service was not ready: {}" , e . into ())) }) ? ; let codec = tonic :: codec :: ProstCodec :: default () ; let path = http :: uri :: PathAndQuery :: from_static ("/tensorboard.data.TensorBoardDataProvider/ReadScalars") ; self . inner . unary (request . into_request () , path , codec) . await } # [doc = " List metadata about tensor time series."] pub async fn list_tensors (& mut self , request : impl tonic :: IntoRequest < super :: ListTensorsRequest > ,) -> Result < tonic :: Response < super :: ListTensorsResponse > , tonic :: Status > { self . inner . ready () . await . map_err (| e | { tonic :: Status :: new (tonic :: Code :: Unknown , format ! ("Service was not ready: {}" , e . into ())) }) ? ; let codec = tonic :: codec :: ProstCodec :: default () ; let path = http :: uri :: PathAndQuery :: from_static ("/tensorboard.data.TensorBoardDataProvider/ListTensors") ; self . inner . unary (request . into_request () , path , codec) . await } # [doc = " Read data from tensor time series."] pub async fn read_tensors (& mut self , request : impl tonic :: IntoRequest < super :: ReadTensorsRequest > ,) -> Result < tonic :: Response < super :: ReadTensorsResponse > , tonic :: Status > { self . inner . ready () . await . map_err (| e | { tonic :: Status :: new (tonic :: Code :: Unknown , format ! ("Service was not ready: {}" , e . into ())) }) ? ; let codec = tonic :: codec :: ProstCodec :: default () ; let path = http :: uri :: PathAndQuery :: from_static ("/tensorboard.data.TensorBoardDataProvider/ReadTensors") ; self . inner . unary (request . into_request () , path , codec) . await } # [doc = " List metadata about blob sequence time series."] pub async fn list_blob_sequences (& mut self , request : impl tonic :: IntoRequest < super :: ListBlobSequencesRequest > ,) -> Result < tonic :: Response < super :: ListBlobSequencesResponse > , tonic :: Status > { self . inner . ready () . await . map_err (| e | { tonic :: Status :: new (tonic :: Code :: Unknown , format ! ("Service was not ready: {}" , e . into ())) }) ? ; let codec = tonic :: codec :: ProstCodec :: default () ; let path = http :: uri :: PathAndQuery :: from_static ("/tensorboard.data.TensorBoardDataProvider/ListBlobSequences") ; self . inner . unary (request . into_request () , path , codec) . await } # [doc = " Read blob references from blob sequence time series. See `ReadBlob` to read"] # [doc = " the actual blob data."] pub async fn read_blob_sequences (& mut self , request : impl tonic :: IntoRequest < super :: ReadBlobSequencesRequest > ,) -> Result < tonic :: Response < super :: ReadBlobSequencesResponse > , tonic :: Status > { self . inner . ready () . await . map_err (| e | { tonic :: Status :: new (tonic :: Code :: Unknown , format ! ("Service was not ready: {}" , e . into ())) }) ? ; let codec = tonic :: codec :: ProstCodec :: default () ; let path = http :: uri :: PathAndQuery :: from_static ("/tensorboard.data.TensorBoardDataProvider/ReadBlobSequences") ; self . inner . unary (request . into_request () , path , codec) . await } # [doc = " Read data for a specific blob."] pub async fn read_blob (& mut self , request : impl tonic :: IntoRequest < super :: ReadBlobRequest > ,) -> Result < tonic :: Response < tonic :: codec :: Streaming < super :: ReadBlobResponse >> , tonic :: Status > { self . inner . ready () . await . map_err (| e | { tonic :: Status :: new (tonic :: Code :: Unknown , format ! ("Service was not ready: {}" , e . into ())) }) ? ; let codec = tonic :: codec :: ProstCodec :: default () ; let path = http :: uri :: PathAndQuery :: from_static ("/tensorboard.data.TensorBoardDataProvider/ReadBlob") ; self . inner . server_streaming (request . into_request () , path , codec) . await } } }# [doc = r" Generated server implementations."] pub mod tensor_board_data_provider_server { # ! [allow (unused_variables , dead_code , missing_docs , clippy :: let_unit_value ,)] use tonic :: codegen :: * ; # [doc = "Generated trait containing gRPC methods that should be implemented for use with TensorBoardDataProviderServer."] # [async_trait] pub trait TensorBoardDataProvider : Send + Sync + 'static { # [doc = " Get metadata about an experiment."] async fn get_experiment (& self , request : tonic :: Request < super :: GetExperimentRequest >) -> Result < tonic :: Response < super :: GetExperimentResponse > , tonic :: Status > ; # [doc = " List plugins that have data for an experiment."] async fn list_plugins (& self , request : tonic :: Request < super :: ListPluginsRequest >) -> Result < tonic :: Response < super :: ListPluginsResponse > , tonic :: Status > ; # [doc = " List runs within an experiment."] async fn list_runs (& self , request : tonic :: Request < super :: ListRunsRequest >) -> Result < tonic :: Response < super :: ListRunsResponse > , tonic :: Status > ; # [doc = " List metadata about scalar time series."] async fn list_scalars (& self , request : tonic :: Request < super :: ListScalarsRequest >) -> Result < tonic :: Response < super :: ListScalarsResponse > , tonic :: Status > ; # [doc = " Read data from scalar time series."] async fn read_scalars (& self , request : tonic :: Request < super :: ReadScalarsRequest >) -> Result < tonic :: Response < super :: ReadScalarsResponse > , tonic :: Status > ; # [doc = " List metadata about tensor time series."] async fn list_tensors (& self , request : tonic :: Request < super :: ListTensorsRequest >) -> Result < tonic :: Response < super :: ListTensorsResponse > , tonic :: Status > ; # [doc = " Read data from tensor time series."] async fn read_tensors (& self , request : tonic :: Request < super :: ReadTensorsRequest >) -> Result < tonic :: Response < super :: ReadTensorsResponse > , tonic :: Status > ; # [doc = " List metadata about blob sequence time series."] async fn list_blob_sequences (& self , request : tonic :: Request < super :: ListBlobSequencesRequest >) -> Result < tonic :: Response < super :: ListBlobSequencesResponse > , tonic :: Status > ; # [doc = " Read blob references from blob sequence time series. See `ReadBlob` to read"] # [doc = " the actual blob data."] async fn read_blob_sequences (& self , request : tonic :: Request < super :: ReadBlobSequencesRequest >) -> Result < tonic :: Response < super :: ReadBlobSequencesResponse > , tonic :: Status > ; # [doc = "Server streaming response type for the ReadBlob method."] type ReadBlobStream : futures_core :: Stream < Item = Result < super :: ReadBlobResponse , tonic :: Status >> + Send + 'static ; # [doc = " Read data for a specific blob."] async fn read_blob (& self , request : tonic :: Request < super :: ReadBlobRequest >) -> Result < tonic :: Response < Self :: ReadBlobStream > , tonic :: Status > ; } # [derive (Debug)] pub struct TensorBoardDataProviderServer < T : TensorBoardDataProvider > { inner : _Inner < T > , accept_compression_encodings : () , send_compression_encodings : () , } struct _Inner < T > (Arc < T >) ; impl < T : TensorBoardDataProvider > TensorBoardDataProviderServer < T > { pub fn new (inner : T) -> Self { let inner = Arc :: new (inner) ; let inner = _Inner (inner) ; Self { inner , accept_compression_encodings : Default :: default () , send_compression_encodings : Default :: default () , } } pub fn with_interceptor < F > (inner : T , interceptor : F) -> InterceptedService < Self , F > where F : tonic :: service :: Interceptor , { InterceptedService :: new (Self :: new (inner) , interceptor) } } impl < T , B > tonic :: codegen :: Service < http :: Request < B >> for TensorBoardDataProviderServer < T > where T : TensorBoardDataProvider , B : Body + Send + 'static , B :: Error : Into < StdError > + Send + 'static , { type Response = http :: Response < tonic :: body :: BoxBody > ; type Error = Never ; type Future = BoxFuture < Self :: Response , Self :: Error > ; fn poll_ready (& mut self , _cx : & mut Context < '_ >) -> Poll < Result < () , Self :: Error >> { Poll :: Ready (Ok (())) } fn call (& mut self , req : http :: Request < B >) -> Self :: Future { let inner = self . inner . clone () ; match req . uri () . path () { "/tensorboard.data.TensorBoardDataProvider/GetExperiment" => { # [allow (non_camel_case_types)] struct GetExperimentSvc < T : TensorBoardDataProvider > (pub Arc < T >) ; impl < T : TensorBoardDataProvider > tonic :: server :: UnaryService < super :: GetExperimentRequest > for GetExperimentSvc < T > { type Response = super :: GetExperimentResponse ; type Future = BoxFuture < tonic :: Response < Self :: Response > , tonic :: Status > ; fn call (& mut self , request : tonic :: Request < super :: GetExperimentRequest >) -> Self :: Future { let inner = self . 0 . clone () ; let fut = async move { (* inner) . get_experiment (request) . await } ; Box :: pin (fut) } } let accept_compression_encodings = self . accept_compression_encodings ; let send_compression_encodings = self . send_compression_encodings ; let inner = self . inner . clone () ; let fut = async move { let inner = inner . 0 ; let method = GetExperimentSvc (inner) ; let codec = tonic :: codec :: ProstCodec :: default () ; let mut grpc = tonic :: server :: Grpc :: new (codec) . apply_compression_config (accept_compression_encodings , send_compression_encodings) ; let res = grpc . unary (method , req) . await ; Ok (res) } ; Box :: pin (fut) } "/tensorboard.data.TensorBoardDataProvider/ListPlugins" => { # [allow (non_camel_case_types)] struct ListPluginsSvc < T : TensorBoardDataProvider > (pub Arc < T >) ; impl < T : TensorBoardDataProvider > tonic :: server :: UnaryService < super :: ListPluginsRequest > for ListPluginsSvc < T > { type Response = super :: ListPluginsResponse ; type Future = BoxFuture < tonic :: Response < Self :: Response > , tonic :: Status > ; fn call (& mut self , request : tonic :: Request < super :: ListPluginsRequest >) -> Self :: Future { let inner = self . 0 . clone () ; let fut = async move { (* inner) . list_plugins (request) . await } ; Box :: pin (fut) } } let accept_compression_encodings = self . accept_compression_encodings ; let send_compression_encodings = self . send_compression_encodings ; let inner = self . inner . clone () ; let fut = async move { let inner = inner . 0 ; let method = ListPluginsSvc (inner) ; let codec = tonic :: codec :: ProstCodec :: default () ; let mut grpc = tonic :: server :: Grpc :: new (codec) . apply_compression_config (accept_compression_encodings , send_compression_encodings) ; let res = grpc . unary (method , req) . await ; Ok (res) } ; Box :: pin (fut) } "/tensorboard.data.TensorBoardDataProvider/ListRuns" => { # [allow (non_camel_case_types)] struct ListRunsSvc < T : TensorBoardDataProvider > (pub Arc < T >) ; impl < T : TensorBoardDataProvider > tonic :: server :: UnaryService < super :: ListRunsRequest > for ListRunsSvc < T > { type Response = super :: ListRunsResponse ; type Future = BoxFuture < tonic :: Response < Self :: Response > , tonic :: Status > ; fn call (& mut self , request : tonic :: Request < super :: ListRunsRequest >) -> Self :: Future { let inner = self . 0 . clone () ; let fut = async move { (* inner) . list_runs (request) . await } ; Box :: pin (fut) } } let accept_compression_encodings = self . accept_compression_encodings ; let send_compression_encodings = self . send_compression_encodings ; let inner = self . inner . clone () ; let fut = async move { let inner = inner . 0 ; let method = ListRunsSvc (inner) ; let codec = tonic :: codec :: ProstCodec :: default () ; let mut grpc = tonic :: server :: Grpc :: new (codec) . apply_compression_config (accept_compression_encodings , send_compression_encodings) ; let res = grpc . unary (method , req) . await ; Ok (res) } ; Box :: pin (fut) } "/tensorboard.data.TensorBoardDataProvider/ListScalars" => { # [allow (non_camel_case_types)] struct ListScalarsSvc < T : TensorBoardDataProvider > (pub Arc < T >) ; impl < T : TensorBoardDataProvider > tonic :: server :: UnaryService < super :: ListScalarsRequest > for ListScalarsSvc < T > { type Response = super :: ListScalarsResponse ; type Future = BoxFuture < tonic :: Response < Self :: Response > , tonic :: Status > ; fn call (& mut self , request : tonic :: Request < super :: ListScalarsRequest >) -> Self :: Future { let inner = self . 0 . clone () ; let fut = async move { (* inner) . list_scalars (request) . await } ; Box :: pin (fut) } } let accept_compression_encodings = self . accept_compression_encodings ; let send_compression_encodings = self . send_compression_encodings ; let inner = self . inner . clone () ; let fut = async move { let inner = inner . 0 ; let method = ListScalarsSvc (inner) ; let codec = tonic :: codec :: ProstCodec :: default () ; let mut grpc = tonic :: server :: Grpc :: new (codec) . apply_compression_config (accept_compression_encodings , send_compression_encodings) ; let res = grpc . unary (method , req) . await ; Ok (res) } ; Box :: pin (fut) } "/tensorboard.data.TensorBoardDataProvider/ReadScalars" => { # [allow (non_camel_case_types)] struct ReadScalarsSvc < T : TensorBoardDataProvider > (pub Arc < T >) ; impl < T : TensorBoardDataProvider > tonic :: server :: UnaryService < super :: ReadScalarsRequest > for ReadScalarsSvc < T > { type Response = super :: ReadScalarsResponse ; type Future = BoxFuture < tonic :: Response < Self :: Response > , tonic :: Status > ; fn call (& mut self , request : tonic :: Request < super :: ReadScalarsRequest >) -> Self :: Future { let inner = self . 0 . clone () ; let fut = async move { (* inner) . read_scalars (request) . await } ; Box :: pin (fut) } } let accept_compression_encodings = self . accept_compression_encodings ; let send_compression_encodings = self . send_compression_encodings ; let inner = self . inner . clone () ; let fut = async move { let inner = inner . 0 ; let method = ReadScalarsSvc (inner) ; let codec = tonic :: codec :: ProstCodec :: default () ; let mut grpc = tonic :: server :: Grpc :: new (codec) . apply_compression_config (accept_compression_encodings , send_compression_encodings) ; let res = grpc . unary (method , req) . await ; Ok (res) } ; Box :: pin (fut) } "/tensorboard.data.TensorBoardDataProvider/ListTensors" => { # [allow (non_camel_case_types)] struct ListTensorsSvc < T : TensorBoardDataProvider > (pub Arc < T >) ; impl < T : TensorBoardDataProvider > tonic :: server :: UnaryService < super :: ListTensorsRequest > for ListTensorsSvc < T > { type Response = super :: ListTensorsResponse ; type Future = BoxFuture < tonic :: Response < Self :: Response > , tonic :: Status > ; fn call (& mut self , request : tonic :: Request < super :: ListTensorsRequest >) -> Self :: Future { let inner = self . 0 . clone () ; let fut = async move { (* inner) . list_tensors (request) . await } ; Box :: pin (fut) } } let accept_compression_encodings = self . accept_compression_encodings ; let send_compression_encodings = self . send_compression_encodings ; let inner = self . inner . clone () ; let fut = async move { let inner = inner . 0 ; let method = ListTensorsSvc (inner) ; let codec = tonic :: codec :: ProstCodec :: default () ; let mut grpc = tonic :: server :: Grpc :: new (codec) . apply_compression_config (accept_compression_encodings , send_compression_encodings) ; let res = grpc . unary (method , req) . await ; Ok (res) } ; Box :: pin (fut) } "/tensorboard.data.TensorBoardDataProvider/ReadTensors" => { # [allow (non_camel_case_types)] struct ReadTensorsSvc < T : TensorBoardDataProvider > (pub Arc < T >) ; impl < T : TensorBoardDataProvider > tonic :: server :: UnaryService < super :: ReadTensorsRequest > for ReadTensorsSvc < T > { type Response = super :: ReadTensorsResponse ; type Future = BoxFuture < tonic :: Response < Self :: Response > , tonic :: Status > ; fn call (& mut self , request : tonic :: Request < super :: ReadTensorsRequest >) -> Self :: Future { let inner = self . 0 . clone () ; let fut = async move { (* inner) . read_tensors (request) . await } ; Box :: pin (fut) } } let accept_compression_encodings = self . accept_compression_encodings ; let send_compression_encodings = self . send_compression_encodings ; let inner = self . inner . clone () ; let fut = async move { let inner = inner . 0 ; let method = ReadTensorsSvc (inner) ; let codec = tonic :: codec :: ProstCodec :: default () ; let mut grpc = tonic :: server :: Grpc :: new (codec) . apply_compression_config (accept_compression_encodings , send_compression_encodings) ; let res = grpc . unary (method , req) . await ; Ok (res) } ; Box :: pin (fut) } "/tensorboard.data.TensorBoardDataProvider/ListBlobSequences" => { # [allow (non_camel_case_types)] struct ListBlobSequencesSvc < T : TensorBoardDataProvider > (pub Arc < T >) ; impl < T : TensorBoardDataProvider > tonic :: server :: UnaryService < super :: ListBlobSequencesRequest > for ListBlobSequencesSvc < T > { type Response = super :: ListBlobSequencesResponse ; type Future = BoxFuture < tonic :: Response < Self :: Response > , tonic :: Status > ; fn call (& mut self , request : tonic :: Request < super :: ListBlobSequencesRequest >) -> Self :: Future { let inner = self . 0 . clone () ; let fut = async move { (* inner) . list_blob_sequences (request) . await } ; Box :: pin (fut) } } let accept_compression_encodings = self . accept_compression_encodings ; let send_compression_encodings = self . send_compression_encodings ; let inner = self . inner . clone () ; let fut = async move { let inner = inner . 0 ; let method = ListBlobSequencesSvc (inner) ; let codec = tonic :: codec :: ProstCodec :: default () ; let mut grpc = tonic :: server :: Grpc :: new (codec) . apply_compression_config (accept_compression_encodings , send_compression_encodings) ; let res = grpc . unary (method , req) . await ; Ok (res) } ; Box :: pin (fut) } "/tensorboard.data.TensorBoardDataProvider/ReadBlobSequences" => { # [allow (non_camel_case_types)] struct ReadBlobSequencesSvc < T : TensorBoardDataProvider > (pub Arc < T >) ; impl < T : TensorBoardDataProvider > tonic :: server :: UnaryService < super :: ReadBlobSequencesRequest > for ReadBlobSequencesSvc < T > { type Response = super :: ReadBlobSequencesResponse ; type Future = BoxFuture < tonic :: Response < Self :: Response > , tonic :: Status > ; fn call (& mut self , request : tonic :: Request < super :: ReadBlobSequencesRequest >) -> Self :: Future { let inner = self . 0 . clone () ; let fut = async move { (* inner) . read_blob_sequences (request) . await } ; Box :: pin (fut) } } let accept_compression_encodings = self . accept_compression_encodings ; let send_compression_encodings = self . send_compression_encodings ; let inner = self . inner . clone () ; let fut = async move { let inner = inner . 0 ; let method = ReadBlobSequencesSvc (inner) ; let codec = tonic :: codec :: ProstCodec :: default () ; let mut grpc = tonic :: server :: Grpc :: new (codec) . apply_compression_config (accept_compression_encodings , send_compression_encodings) ; let res = grpc . unary (method , req) . await ; Ok (res) } ; Box :: pin (fut) } "/tensorboard.data.TensorBoardDataProvider/ReadBlob" => { # [allow (non_camel_case_types)] struct ReadBlobSvc < T : TensorBoardDataProvider > (pub Arc < T >) ; impl < T : TensorBoardDataProvider > tonic :: server :: ServerStreamingService < super :: ReadBlobRequest > for ReadBlobSvc < T > { type Response = super :: ReadBlobResponse ; type ResponseStream = T :: ReadBlobStream ; type Future = BoxFuture < tonic :: Response < Self :: ResponseStream > , tonic :: Status > ; fn call (& mut self , request : tonic :: Request < super :: ReadBlobRequest >) -> Self :: Future { let inner = self . 0 . clone () ; let fut = async move { (* inner) . read_blob (request) . await } ; Box :: pin (fut) } } let accept_compression_encodings = self . accept_compression_encodings ; let send_compression_encodings = self . send_compression_encodings ; let inner = self . inner . clone () ; let fut = async move { let inner = inner . 0 ; let method = ReadBlobSvc (inner) ; let codec = tonic :: codec :: ProstCodec :: default () ; let mut grpc = tonic :: server :: Grpc :: new (codec) . apply_compression_config (accept_compression_encodings , send_compression_encodings) ; let res = grpc . server_streaming (method , req) . await ; Ok (res) } ; Box :: pin (fut) } _ => Box :: pin (async move { Ok (http :: Response :: builder () . status (200) . header ("grpc-status" , "12") . header ("content-type" , "application/grpc") . body (empty_body ()) . unwrap ()) }) , } } } impl < T : TensorBoardDataProvider > Clone for TensorBoardDataProviderServer < T > { fn clone (& self) -> Self { let inner = self . inner . clone () ; Self { inner , accept_compression_encodings : self . accept_compression_encodings , send_compression_encodings : self . send_compression_encodings , } } } impl < T : TensorBoardDataProvider > Clone for _Inner < T > { fn clone (& self) -> Self { Self (self . 0 . clone ()) } } impl < T : std :: fmt :: Debug > std :: fmt :: Debug for _Inner < T > { fn fmt (& self , f : & mut std :: fmt :: Formatter < '_ >) -> std :: fmt :: Result { write ! (f , "{:?}" , self . 0) } } impl < T : TensorBoardDataProvider > tonic :: transport :: NamedService for TensorBoardDataProviderServer < T > { const NAME : & 'static str = "tensorboard.data.TensorBoardDataProvider" ; } }