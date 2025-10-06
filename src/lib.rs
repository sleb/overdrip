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

    pub fn config(&self) -> Result<()> {
        println!("Managing configuration!");
        Ok(())
    }

    pub fn login(&self) -> Result<()> {
        println!("Logging in!");
        Ok(())
    }

    pub fn logout(&self) -> Result<()> {
        println!("Logging out!");
        Ok(())
    }
}
