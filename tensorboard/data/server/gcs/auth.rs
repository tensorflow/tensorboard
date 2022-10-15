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

use log::warn;
use std::fmt::{self, Debug};
use std::sync::RwLock;

use gcp_auth::AuthenticationManager;
use reqwest::blocking::RequestBuilder;
use tokio::sync::OnceCell;

const SCOPES: &[&str] = &["https://www.googleapis.com/auth/cloud-platform"];

static AUTH_MANAGER: OnceCell<AuthenticationManager> = OnceCell::const_new();

fn get_token() -> Result<AccessToken, gcp_auth::Error> {
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
        .block_on(service_account_token())?;

    Ok(AccessToken::from_gcs_token(Some(token)))
}

/// A potentially active token. Use [`authenticate`][Self::authenticate] to add an `Authorization`
/// header to an outgoing request, fetching a fresh access token if necessary.
///
/// A `TokenStore` may be freely shared among threads; it synchronizes internally if needed.
pub struct TokenStore {
    token: RwLock<Option<AccessToken>>,
}

impl TokenStore {
    /// Creates a new token store from the given credentials.
    ///
    /// This operation is cheap and does not actually fetch any access tokens.
    pub fn new() -> Self {
        Self {
            token: RwLock::new(None),
        }
    }
}

/// Private access token module to prevent accidental leaking of tokens into logs, etc. An access
/// token can be attached to a request, but cannot be directly extracted.
mod access_token {
    use super::*;
    pub struct AccessToken(Option<gcp_auth::Token>);
    impl AccessToken {
        /// Attaches this token to an outgoing request.
        pub fn authenticate(&self, rb: RequestBuilder) -> RequestBuilder {
            match &self.0 {
                Some(t) => rb.bearer_auth(t.as_str()),
                _ => rb,
            }
        }

        pub fn is_valid(&self) -> bool {
            match &self.0 {
                Some(t) => t.has_expired(),
                _ => false,
            }
        }

        pub fn from_gcs_token(token: Option<gcp_auth::Token>) -> Self {
            Self(token)
        }

        pub fn anonymous(&self) -> bool {
            match &self.0 {
                Some(_) => false,
                _ => true,
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
        if let Some(t) = &*token {
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
        if let Some(t) = &*token {
            if t.anonymous() {
                return rb;
            }
            if t.is_valid() {
                return t.authenticate(rb);
            }
        };
        // If we get here, we need a fresh token.
        match get_token() {
            Ok(t) => *token = Some(t),
            Err(e) => {
                warn!("GCS authentication failed: {}", e);
                return rb;
            }
        }
        if let Some(ref t) = *token {
            // debug!(
            //     "Obtained new access token, live for the next {:?}",
            //     t.expires.saturating_duration_since(Instant::now())
            // );
            if t.is_valid() {
                return t.authenticate(rb);
            }
        }
        rb
    }
}
