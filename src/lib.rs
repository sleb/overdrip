use anyhow::Result;

use crate::config::Config;

pub mod cli;
pub mod config;

#[derive(Debug)]
pub struct Overdrip {
    config: Config,
}

impl Overdrip {
    pub fn new(config: Config) -> Self {
        Overdrip { config }
    }

    pub fn run(&self) -> Result<()> {
        println!("Overdrip is running!");
        Ok(())
    }
}
