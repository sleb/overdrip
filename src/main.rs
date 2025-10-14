use std::{path::PathBuf, process, sync::OnceLock};

use anyhow::{Context, Result, anyhow};
use clap::Parser;
use directories::ProjectDirs;
use log::{debug, error, info};
use overdrip::{
    Overdrip,
    cli::{Cli, Subcommand, config},
    config::load_config,
};

static PROJECT_DIR: OnceLock<Option<PathBuf>> = OnceLock::new();

fn project_dir() -> Option<&'static PathBuf> {
    PROJECT_DIR
        .get_or_init(|| {
            ProjectDirs::from("dev", "sleb", "overdrip").map(|d| d.data_dir().to_path_buf())
        })
        .as_ref()
}

fn default_config_path() -> Result<PathBuf> {
    let path = project_dir()
        .context("Could not determine config directory")?
        .join("config.toml");

    Ok(path)
}

fn default_auth_path() -> Result<PathBuf> {
    let path = project_dir()
        .context("Could not determine auth director")?
        .join("auth.json");

    Ok(path)
}

#[tokio::main]
async fn main() {
    env_logger::init();

    if let Err(e) = run().await {
        error!("Error: {e}");
        debug!("Error: {e:?}");
        process::exit(1);
    }
}

async fn run() -> Result<()> {
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
        Subcommand::Login => overdrip.login().await?,
        Subcommand::Logout => overdrip.logout()?,
    }

    Ok(())
}
