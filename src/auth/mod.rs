use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

use crate::auth::token_store::TokenStore;

pub mod oauth;
pub mod token_store;

#[derive(Serialize, Deserialize, Debug)]
pub struct Tokens {
    access_token: String,
    refresh_token: String,
    expires_in: u64,
}

pub struct Auth<S>
where
    S: TokenStore,
{
    token_store: S,
}

impl<S> Auth<S>
where
    S: TokenStore,
{
    pub fn new(token_store: S) -> Self {
        Auth { token_store }
    }

    pub async fn login(&self) -> Result<()> {
        let pkce = oauth::generate_pkce_challenge();
        let auth_url = format!(
            "https://accounts.google.com/o/oauth2/v2/auth?\
               client_id={}&\
               redirect_uri=http://localhost:8080/callback&\
               response_type=code&\
               scope=openid%20email%20profile&\
               code_challenge={}&\
               code_challenge_method=S256",
            oauth::CLIENT_ID,
            pkce.challenge,
        );

        println!("Login at: {auth_url}",);
        let code = oauth::start_oath_server().await?;
        let tokens = oauth::exchange_code_for_tokens(&pkce.verifier, &code).await?;

        self.token_store
            .save_tokens(&tokens)
            .context("Failed to save tokens")
    }
}
