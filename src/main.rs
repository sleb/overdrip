use std::process;

use anyhow::Result;
use clap::Parser;
use log::{debug, error, info};
use overdrip::{
    Overdrip,
    cli::{Cli, Subcommand, config},
    config::load_config,
    default_config_path,
};

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

    let config_path = cli.config.unwrap_or(default_config_path());
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
