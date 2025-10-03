use std::path::Path;

use log::debug;
use serde::{Deserialize, Serialize};
use thiserror::Error;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerConfig {
    pub port: u16,
}

impl Default for ServerConfig {
    fn default() -> Self {
        ServerConfig { port: 8080 }
    }
}

#[derive(Default, Debug, Serialize, Deserialize)]
pub struct Config {
    pub monitor: MonitorConfig,
    pub server: ServerConfig,
}

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("Failed to read config file: '{0}': {1}")]
    Io(String, #[source] std::io::Error),

    #[error("Invalid config file path '{path}': {message}")]
    InvalidPath { path: String, message: String },

    #[error("TOML deserialization error: {0}")]
    Deserialization(#[from] toml::de::Error),

    #[error("TOML serialization error: {0}")]
    Serialization(#[from] toml::ser::Error),
}

type Result<T> = std::result::Result<T, ConfigError>;

pub fn get_or_init_config(path: &Path) -> Result<Config> {
    let config_dir = path.parent().ok_or_else(|| ConfigError::InvalidPath {
        path: path.display().to_string(),
        message: "No parent directory".to_string(),
    })?;

    if !config_dir.exists() {
        std::fs::create_dir_all(config_dir)
            .map_err(|e| ConfigError::Io(config_dir.display().to_string(), e))?;
        debug!("Created config directory at {}", config_dir.display());
    }

    if !path.exists() {
        let default_config = Config::default();
        let toml_str = toml::to_string_pretty(&default_config)?;
        std::fs::write(path, toml_str)
            .map_err(|e| ConfigError::Io(path.display().to_string(), e))?;
        debug!("Created default config file at {}", path.display());

        return Ok(default_config);
    }

    load_config(path)
}

fn load_config(path: &Path) -> Result<Config> {
    let contents = std::fs::read_to_string(path)
        .map_err(|e| ConfigError::Io(path.display().to_string(), e))?;

    let config: Config = toml::from_str(&contents)?;
    Ok(config)
}
