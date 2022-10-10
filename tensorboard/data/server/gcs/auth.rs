/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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

//! OAuth integration for GCS.
//!
//! Useful resources:
//!
//!   - TensorFlow OAuth implementation: [`oauth_client.cc`], [`google_auth_provider.cc`]
//!   - [RFC 6749]: The OAuth 2.0 Authorization Framework
//!   - ["Refreshing Access Tokens"] OAuth guide
//!
//! [`oauth_client.cc`]: https://github.com/tensorflow/tensorflow/blob/r2.4/tensorflow/core/platform/cloud/oauth_client.cc
//! [`google_auth_provider.cc`]: https://github.com/tensorflow/tensorflow/blob/r2.4/tensorflow/core/platform/cloud/google_auth_provider.cc
//! [RFC 6749]: https://tools.ietf.org/html/rfc6749
//! ["Refreshing Access Tokens"]: https://www.oauth.com/oauth2-servers/access-tokens/refreshing-access-tokens/

use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use std::fmt::{self, Debug};
use std::fs::File;
use std::io::BufReader;
use std::path::PathBuf;
use std::sync::RwLock;
use std::time::{Duration, Instant};

use gcp_auth::AuthenticationManager;
use reqwest::blocking::{Client as HttpClient, RequestBuilder};
use tokio::sync::OnceCell;

static AUTH_MANAGER: OnceCell<AuthenticationManager> = OnceCell::const_new();

fn get_token() -> AccessToken {
    async fn authentication_manager() -> &'static AuthenticationManager {
        AUTH_MANAGER
            .get_or_init(|| async {
                AuthenticationManager::new()
                    .await
                    .expect("unable to initialize authentication manager")
            })
            .await
    }
    async fn service_account_token() -> Result<gcp_auth::Token, gcp_auth::Error> {
        let manager = authentication_manager().await;
        let token_res = manager.get_token(SCOPES).await;
        token_res
    }

    let token = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(service_account_token());


    AccessToken::from_gcs_token(token.ok())
}

const OAUTH_REFRESH_TOKEN_ENDPOINT: &str = "https://www.googleapis.com/oauth2/v3/token";

/// Refresh access tokens once their remaining lifetime is shorter than this threshold.
const TOKEN_EXPIRATION_MARGIN: Duration = Duration::from_secs(60);

/// A set of refreshable OAuth credentials plus a potentially active token. Use
/// [`authenticate`][Self::authenticate] to add an `Authorization` header to an outgoing request,
/// fetching a fresh access token if necessary.
///
/// A `TokenStore` may be freely shared among threads; it synchronizes internally if needed.
pub struct TokenStore {
    creds: Credentials,
    token: RwLock<Option<AccessToken>>,
}

impl TokenStore {
    /// Creates a new token store from the given credentials.
    ///
    /// This operation is cheap and does not actually fetch any access tokens.
    pub fn new(creds: Credentials) -> Self {
        Self {
            creds,
            token: RwLock::new(None),
        }
    }
}

/// An access token that's valid until a particular point in time.
#[derive(Debug)]
struct BoundedToken {
    access_token: AccessToken,
    expires: Instant,
}

impl BoundedToken {
    /// Checks whether `token` represents a token that will still be valid for at least the given
    /// `lifetime`, and if so returns a reference to the inner access token.
    fn unwrap_if_valid_for(token: &Option<Self>, lifetime: Duration) -> Option<&AccessToken> {
        match token.as_ref() {
            Some(t) if (Instant::now() + lifetime < t.expires) => Some(&t.access_token),
            _ => None,
        }
    }
}

/// Private access token module to prevent accidental leaking of tokens into logs, etc. An access
/// token can be attached to a request, but cannot be directly extracted.
mod access_token {
    use super::*;
    #[derive(Deserialize)]
    pub struct AccessToken(Option<gcp_auth::Token>);
    impl AccessToken {
        /// Attaches this token to an outgoing request.
        pub fn authenticate(&self, rb: RequestBuilder) -> RequestBuilder {
            match &self.0 {
                Some(t) => rb.bearer_auth(t.as_str()),
                _ => rb
            }
        }

        pub fn is_valid(&self) -> bool {
            match &self.0 {
                Some(t) => t.has_expired(),
                _ => false
            }
        }

        pub fn from_gcs_token(token: Option<gcp_auth::Token>) -> Self {
            Self(token)
        }

        pub fn anonymous(&self) -> bool {
            match &self.0 {
                Some(_) => false,
                _ => true
            }
        }
    }
    impl Debug for AccessToken {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            self.0.fmt(f)
        }
    }
}
use access_token::AccessToken;

impl TokenStore {
    /// Attempts to attach an access token to the given outgoing request.
    ///
    /// A cached token will be reused if it is expected to be valid for at least `lifetime`.
    /// Otherwise, a new token will be fetched and stored.
    pub fn authenticate(&self, rb: RequestBuilder) -> RequestBuilder {
        // check if access token is not none but token inside is none

        let token = self.token.read().expect("failed to read auth token");
        if let Some(t)=  &*token {
            if t.anonymous() {
                return rb;
            }
            if t.is_valid() {
                return t.authenticate(rb);
            }
        }
        drop(token);
        let mut token = self.token.write().expect("failed to write auth token");
        // Check again: may have just been written by a different client, in which case no need to
        // re-fetch.
        if let Some(t)=  &*token {
            if t.anonymous() {
                return rb;
            }
            if t.is_valid() {
                return t.authenticate(rb);
            }
        };
        // If we get here, we need a fresh token.
        *token = Some(get_token());
        if let Some(ref t) = *token {
            // debug!(
            //     "Obtained new access token, live for the next {:?}",
            //     t.expires.saturating_duration_since(Instant::now())
            // );
            if t.is_valid() {
                return t.authenticate(rb);
            }
        };
        rb
    }
}

/// The user's persistent credentials, if any. This represents all the information needed to
/// request access tokens.
#[derive(Debug)]
pub enum Credentials {
    Anonymous,
    RefreshToken(RefreshToken),
    ServiceToken,
}
// public wrapper struct to hide private implementation details
pub struct RefreshToken(RefreshTokenCreds);

impl Default for Credentials {
    fn default() -> Self {
        Self::Anonymous
    }
}

#[derive(Debug, thiserror::Error)]
pub enum CredentialsError {
    #[error("failed to open GCS credentials file {}: {}", .0.display(), .1)]
    Unreadable(PathBuf, std::io::Error),
    #[error("failed to parse GCS credentials file {}: {}", .0.display(), .1)]
    Unparseable(PathBuf, serde_json::Error),
    #[error("{1} (credentials file {0})")]
    Unsupported(PathBuf, UnsupportedCredentialsError),
}

const SCOPES: &[&str] = &["https://www.googleapis.com/auth/cloud-platform"];

/// Attempts to retrieve a service `gcp_auth::Token`, and convert it into a consistent format
fn gce_service_auth_token() -> Result<BoundedToken, gcp_auth::Error> {
    async fn service_account_token() -> Result<gcp_auth::Token, gcp_auth::Error> {
        let authentication_manager = gcp_auth::AuthenticationManager::new().await?;
        let token_res = authentication_manager.get_token(SCOPES).await;
        token_res
    }

    let service_token = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(service_account_token())?;

    let serialized = serde_json::to_string(&service_token).unwrap();
    let deserialized: OauthTokenResponse = serde_json::from_str(&serialized).unwrap();

    Ok(BoundedToken {
        access_token: deserialized.access_token,
        expires: Instant::now() + Duration::from_secs(6000),
    })
}

impl Credentials {
    /// Reads credentials from disk.
    ///
    /// The path is taken from the `GOOGLE_APPLICATION_CREDENTIALS` environment variable if set,
    /// else `"${XDG_CONFIG_HOME-${HOME}/.config}/gcloud/application_default_credentials.json"`. If
    /// the credentials file is not found or not readable, this will return an error value; call
    /// [`unwrap_or_default`][Result::unwrap_or_default] to fall back to anonymous credentials.
    pub fn from_disk() -> Result<Self, CredentialsError> {
        let creds_file = match Self::credentials_file() {
            None => return Ok(Credentials::Anonymous),
            Some(f) => f,
        };
        let reader = match File::open(&creds_file).map(BufReader::new) {
            Err(e) => return Err(CredentialsError::Unreadable(creds_file, e)),
            Ok(f) => f,
        };
        let app_creds: ApplicationCreds = match serde_json::from_reader(reader) {
            Err(e) => return Err(CredentialsError::Unparseable(creds_file, e)),
            Ok(app_creds) => app_creds,
        };
        let creds = match app_creds.into_credentials() {
            Err(e) => return Err(CredentialsError::Unsupported(creds_file, e)),
            Ok(creds) => creds,
        };
        info!("Using GCS creds from {}", creds_file.display());
        Ok(creds)
    }

    /// Determines the file on disk from which credentials might be read, if any.
    fn credentials_file() -> Option<PathBuf> {
        if let Some(p) = std::env::var_os("GOOGLE_APPLICATION_CREDENTIALS") {
            return Some(p.into());
        }
        let base_config_dir = std::env::var_os("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|p| PathBuf::from(p).join(".config")));
        if let Some(mut path) = base_config_dir {
            path.extend(&["gcloud", "application_default_credentials.json"]);
            if path.is_file() {
                return Some(path);
            }
        };
        None
    }

    /// Tests whether this credential is inherently anonymous. If this returns `true`, then
    /// [`Self::fetch`] will always return `None`.
    ///
    /// This exists as an optimization so that a [`TokenStore`] doesn't need to check locks all the
    /// time when the credential is anonymous, anyway.
    fn anonymous(&self) -> bool {
        matches!(self, Credentials::Anonymous)
    }

    /// Attempts to fetch a fresh access token with these credentials.
    fn fetch(&self, http: &HttpClient) -> Option<BoundedToken> {
        match self {
            Credentials::Anonymous => None,
            Credentials::RefreshToken(RefreshToken(creds)) => match creds.fetch(http) {
                Ok(t) => Some(t),
                Err(e) => {
                    warn!("GCS authentication failed: {}", e);
                    None
                }
            },
            Credentials::ServiceToken => Credentials::fetch_service_token(),
        }
    }

    /// Checks if a service token can be retrieved.
    pub fn can_fetch_service_token() -> bool {
        match Credentials::fetch_service_token() {
            Some(_) => true,
            None => false,
        }
    }

    /// Attempts to fetch a fresh service token.
    fn fetch_service_token() -> Option<BoundedToken> {
        match gce_service_auth_token() {
            Ok(t) => Some(t),
            Err(e) => {
                warn!("GCS service authentication failed: {}", e);
                None
            }
        }
    }
}

/// Partial structure of the `GOOGLE_APPLICATION_CREDENTIALS` file.
#[derive(Deserialize)]
struct ApplicationCreds {
    r#type: Option<String>,
    client_id: Option<String>,
    client_secret: Option<String>,
    refresh_token: Option<String>,
}

/// User's credentials may be valid, but are not supported.
///
/// Currently, we only support OAuth refresh tokens, not service account private keys.
#[derive(Debug, thiserror::Error)]
#[error("unsupported GCS credentials of type {creds_type:?}; only OAuth refresh tokens supported")]
pub struct UnsupportedCredentialsError {
    /// The `"type"` field found in the credentials JSON file, for informational purposes.
    creds_type: String,
}

impl ApplicationCreds {
    fn into_credentials(self) -> Result<Credentials, UnsupportedCredentialsError> {
        match (self.client_id, self.client_secret, self.refresh_token) {
            (Some(client_id), Some(client_secret), Some(refresh_token)) => {
                Ok(Credentials::RefreshToken(RefreshToken(RefreshTokenCreds {
                    client_id,
                    client_secret,
                    refresh_token,
                })))
            }
            _ => Err(UnsupportedCredentialsError {
                creds_type: self.r#type.unwrap_or_default(),
            }),
        }
    }
}

/// Persistent credentials in the form of an OAuth refresh token. Can be posted to an OAuth token
/// endpoint to obtain a short-lived access token.
#[derive(Deserialize)]
struct RefreshTokenCreds {
    client_id: String,
    client_secret: String,
    refresh_token: String,
}
impl Debug for RefreshTokenCreds {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("RefreshTokenCreds")
            .field("client_id", &self.client_id)
            .field("client_secret", &format_args!("<redacted>"))
            .field("refresh_token", &format_args!("<redacted>"))
            .finish()
    }
}
impl Debug for RefreshToken {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", &self.0)
    }
}

/// POST body to [`OAUTH_REFRESH_TOKEN_ENDPOINT`].
#[derive(Serialize)]
struct RefreshTokenRequest<'a> {
    client_id: &'a str,
    client_secret: &'a str,
    refresh_token: &'a str,
    grant_type: &'a str,
}
/// Response body from [`OAUTH_REFRESH_TOKEN_ENDPOINT`].
#[derive(Deserialize)]
struct OauthTokenResponse {
    access_token: AccessToken,
    #[serde(default = "OauthTokenResponse::default_expires_in")] // optional per OAuth spec
    expires_in: u64, // seconds
}
impl OauthTokenResponse {
    fn default_expires_in() -> u64 {
        let v = 3599; // standard response from Google OAuth servers
        warn!("OAuth response did not set `expires_in`; assuming {}", v);
        v
    }
}

impl RefreshTokenCreds {
    /// Fetches a new access token from this refresh token credential.
    pub fn fetch(&self, http: &HttpClient) -> reqwest::Result<BoundedToken> {
        debug!("Fetching access token from refresh token");
        let req = RefreshTokenRequest {
            client_id: &self.client_id,
            client_secret: &self.client_secret,
            refresh_token: &self.refresh_token,
            grant_type: "refresh_token",
        };
        let res: OauthTokenResponse = http
            .post(OAUTH_REFRESH_TOKEN_ENDPOINT)
            .json(&req)
            .send()?
            .error_for_status()?
            .json()?;
        Ok(BoundedToken {
            access_token: res.access_token,
            expires: Instant::now() + Duration::from_secs(res.expires_in),
        })
    }
}
