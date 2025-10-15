use std::path::PathBuf;

use anyhow::Result;
use directories::ProjectDirs;
use log::warn;

use crate::{auth::token_store::FileTokenStore, config::Config};

mod auth;
pub mod cli;
pub mod config;

fn project_dir() -> PathBuf {
    ProjectDirs::from("dev", "sleb", "overdrip")
        .map(|d| d.data_dir().to_path_buf())
        .unwrap_or_else(|| {
            warn!("unable to determine user project dir, defaulting to current working dir");
            PathBuf::from(".")
        })
}

pub fn default_config_path() -> PathBuf {
    project_dir().join("config.toml")
}

pub fn default_auth_path() -> PathBuf {
    project_dir().join("auth.json")
}

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
        auth::Auth::new(FileTokenStore::new(self.config.tokens_path.clone()))
            .login()
            .await
    }

    pub fn logout(&self) -> Result<()> {
        todo!()
    }
}
