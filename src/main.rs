use std::{path::PathBuf, process};

use anyhow::{Context, Result, anyhow};
use clap::Parser;
use directories::ProjectDirs;
use log::{debug, error, info};
use overdrip::{
    Overdrip,
    cli::{Cli, Subcommand, config},
    config::load_config,
};

fn default_config_path() -> Result<PathBuf> {
    let path = ProjectDirs::from("dev", "sleb", "overdrip")
        .map(|d| d.data_dir().join("config.toml"))
        .context("Could not determine config directory")?;

    Ok(path)
}

fn main() {
    env_logger::init();

    if let Err(e) = run() {
        error!("Error: {e}");
        debug!("Error: {e:?}");
        process::exit(1);
    }
}

fn run() -> Result<()> {
    let cli = Cli::parse();
    debug!("CLI args: {cli:?}");

    let config_path = cli
        .config
        .ok_or(anyhow!("Config path not specified on the CLI"))
        .or(default_config_path())?;
    info!("using config path: '{}'", &config_path.display());

    let config = load_config(&config_path)?;
    debug!("config {config:?}");
    info!("config loaded successfully!");

    let overdrip = Overdrip::new(config);

    match &cli.subcommand {
        Subcommand::Run => overdrip.run()?,
        Subcommand::Config { subcommand } => match subcommand {
            config::Subcommand::Edit => config::edit(&config_path)?,
            config::Subcommand::Show => config::show(&overdrip.config)?,
        },
        Subcommand::Login => overdrip.login()?,
        Subcommand::Logout => overdrip.logout()?,
    }

    Ok(())
}
