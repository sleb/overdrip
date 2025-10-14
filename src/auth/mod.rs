use anyhow::Result;

use oath::{CLIENT_ID, generate_pkce_challenge};

pub mod oath;
pub mod token_store;

pub async fn login() -> Result<()> {
    let pkce = generate_pkce_challenge();
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
           client_id={}&\
           redirect_uri=http://localhost:8080/callback&\
           response_type=code&\
           scope=openid%20email%20profile&\
           code_challenge={}&\
           code_challenge_method=S256",
        CLIENT_ID, pkce.challenge,
    );

    println!("Login at: {auth_url}",);
    let code = oath::start_oath_server().await?;
    let token = oath::exchange_code_for_tokens(&pkce.verifier, &code).await?;
    println!("Token: {:?}", token);
    Ok(())
}
