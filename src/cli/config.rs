use std::{env, path::Path, process::Command};

use anyhow::{Context, Result};
use log::warn;

use crate::config::Config;

#[derive(clap::Subcommand, Debug)]
pub enum Subcommand {
    /// Edit the configuration file
    Edit,

    /// Show the current configuration
    Show,
}

pub fn edit(config_path: &Path) -> Result<()> {
    let editor = env::var("EDITOR")
        .or(env::var("VISUAL"))
        .unwrap_or_else(|_| {
            warn!("unable to determine editor, defaulting to 'nano'");
            "nano".to_string()
        });

    Command::new(editor)
        .arg(config_path)
        .status()
        .context("failed to open editor")?;

    Ok(())
}

pub fn show(config: &Config) -> Result<()> {
    println!("{}", toml::to_string_pretty(config)?);
    Ok(())
}
