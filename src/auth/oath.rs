use anyhow::{Context, Result};
use axum::{Router, extract::Query, response::Html, routing::get};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use log::{debug, warn};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::{
    net::TcpListener,
    sync::{mpsc::channel, oneshot},
};

pub(crate) const CLIENT_ID: &str = env!("OAUTH_CLIENT_ID");
pub(crate) const CLIENT_SECRET: &str = env!("OAUTH_CLIENT_SECRET");

#[derive(Deserialize, Debug)]
struct AuthCallback {
    code: String,
}

pub(crate) struct PkceChallenge {
    pub verifier: String,
    pub challenge: String,
}

pub(crate) fn generate_pkce_challenge() -> PkceChallenge {
    // Generate random verifier
    let random_bytes: [u8; 32] = rand::rng().random();
    let verifier = URL_SAFE_NO_PAD.encode(random_bytes);

    // Hash it to create challenge
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let challenge = URL_SAFE_NO_PAD.encode(hasher.finalize());

    PkceChallenge {
        verifier,
        challenge,
    }
}

pub(crate) async fn start_oath_server() -> Result<String> {
    let (tx, mut rx) = channel::<String>(1);
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    let app = Router::new().route(
        "/callback",
        get(move |Query(params): Query<AuthCallback>| async move {
            if let Err(e) = tx.send(params.code).await {
                warn!("Failed to send auth code to receiver: {}", e);
                Html("<h1>Authentication failed</h1><p>The authentication session may have timed out. Please try again.</p>")
            } else {
                Html("<h1>Authentication successful!</h1><p>You can now close this window.</p>")
            }
        }),
    );

    let listener = TcpListener::bind("localhost:8080").await?;
    let server = axum::serve(listener, app).with_graceful_shutdown(async {
        shutdown_rx.await.ok();
    });

    let server_handle = tokio::spawn(async move {
        if let Err(e) = server.await {
            warn!("OAuth server error: {}", e);
        }
    });

    let code = rx
        .recv()
        .await
        .context("Channel closed before receiving auth code")?;

    // Signal server to shut down
    if let Err(_) = shutdown_tx.send(()) {
        warn!("Failed to send shutdown signal");
    }

    // Wait for server to finish
    server_handle.await.context("Server task panicked")?;

    Ok(code)
}

#[derive(Debug, Serialize, Deserialize)]
struct TokenRequest {
    code: String,
    client_id: String,
    client_secret: String,
    code_verifier: String,
    redirect_uri: String,
    grant_type: String,
}

impl TokenRequest {
    fn new(code: &str, code_verifier: &str) -> Self {
        Self {
            code: code.to_string(),
            client_id: CLIENT_ID.to_string(),
            client_secret: CLIENT_SECRET.to_string(),
            code_verifier: code_verifier.to_string(),
            redirect_uri: "http://localhost:8080/callback".to_string(),
            grant_type: "authorization_code".to_string(),
        }
    }
}

pub(crate) async fn exchange_code_for_tokens(code_verifier: &str, code: &str) -> Result<()> {
    let client = reqwest::Client::new();
    let request = client
        .post("https://oauth2.googleapis.com/token")
        .form(&TokenRequest::new(code, code_verifier));
    debug!("requesting tokens: {request:?}");

    let res = request.send().await?;
    debug!("Token response: {:?}", res.text().await?);

    Ok(())
}
