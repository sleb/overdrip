/// Command line interface for Overdrip
#[derive(clap::Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct Cli {
    /// Path to the configuration file
    #[clap(short, long)]
    pub config: Option<std::path::PathBuf>,

    /// Subcommand to execute
    #[command(subcommand)]
    pub subcommand: Subcommand,
}

#[derive(clap::Subcommand, Debug)]
pub enum Subcommand {
    /// Run the Overdrip service
    Run,

    /// Manage configuration
    Config,

    /// Authenticate with the service
    Login,

    /// Logout from the service
    Logout,
}
