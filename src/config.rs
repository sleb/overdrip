use std::{fs, path::Path};

use anyhow::{Context, Result};
use log::{debug, info};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct MonitorConfig {
    pub interval: u64,
    pub threshold: f64,
}

impl Default for MonitorConfig {
    fn default() -> Self {
        MonitorConfig {
            interval: 60,
            threshold: 0.8,
        }
    }
}

#[derive(Default, Debug, Serialize, Deserialize)]
pub struct Config {
    pub monitor: MonitorConfig,
}

fn write_config(path: &Path, config: &Config) -> Result<()> {
    let config_str = toml::to_string_pretty(&config)?;

    let config_dir = path.parent().with_context(|| {
        format!(
            "Couldn't determine config parent dir for path: '{}'",
            path.display()
        )
    })?;

    if !config_dir.exists() {
        fs::create_dir_all(config_dir)
            .with_context(|| format!("Failed to create '{}'", config_dir.display()))?;
        debug!("Created config directory at {}", config_dir.display());
    }

    fs::write(path, config_str)
        .with_context(|| format!("Failed to write config to '{}'", path.display()))?;
    Ok(())
}

fn init_config(path: &Path) -> Result<()> {
    write_config(path, &Config::default())
}

pub fn load_config(path: &Path) -> Result<Config> {
    if !path.exists() {
        info!(
            "Config file '{}' does not exist, creating default",
            path.display()
        );
        init_config(path)?;
    }

    let contents = fs::read_to_string(path)
        .with_context(|| format!("Failed to read config file '{}'", path.display()))?;

    Ok(toml::from_str(&contents)?)
}
