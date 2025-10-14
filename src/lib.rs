use anyhow::Result;

use crate::config::Config;

mod auth;
pub mod cli;
pub mod config;

#[derive(Debug)]
pub struct Overdrip {
    pub config: Config,
}

impl Overdrip {
    pub fn new(config: Config) -> Self {
        Overdrip { config }
    }

    pub fn run(&self) -> Result<()> {
        println!("Overdrip is running!");
        Ok(())
    }

    pub async fn login(&self) -> Result<()> {
        auth::login().await
    }

    pub fn logout(&self) -> Result<()> {
        todo!()
    }
}
