use std::{
    path::{Path, PathBuf},
    process,
    sync::OnceLock,
};

use anyhow::{Context, Result};
use directories::ProjectDirs;
use log::{debug, error, info};
use overdrip::{
    Overdrip,
    config::{Config, get_or_init_config},
};

static CONFIG_DIR: OnceLock<Option<PathBuf>> = OnceLock::new();

fn config_dir() -> Result<&'static Path> {
    let dirs = ProjectDirs::from("dev", "sleb", "overdrip");
    let dir = CONFIG_DIR
        .get_or_init(|| dirs.map(|d| d.data_dir().join("config.toml")))
        .as_ref()
        .context("Could not determine config directory")?;

    Ok(dir)
}

fn main() {
    env_logger::init();
    info!("starting overdrip");

    if let Err(e) = run() {
        error!("Error: {e}");
        debug!("Error: {e:?}");
        process::exit(1);
    }
}

fn run() -> Result<()> {
    let path = config_dir()?;
    info!("loading config from {}", path.display());

    let config = get_or_init_config(path)?;
    info!("config loaded successfully");
    debug!("config {config:?}");

    run_with_config(config)
}

fn run_with_config(config: Config) -> Result<()> {
    Overdrip::new(config).run()
}
