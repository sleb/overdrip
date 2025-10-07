use anyhow::Result;

use crate::config::Config;

pub mod cli;
pub mod config;

#[derive(Debug)]
pub struct Overdrip {
    pub config: Config,
}

impl Overdrip {
    pub fn new(config: Config) -> Self {
        Overdrip { config }
    }

    pub fn run(&self) -> Result<()> {
        println!("Overdrip is running!");
        Ok(())
    }

    pub fn login(&self) -> Result<()> {
        todo!()
    }

    pub fn logout(&self) -> Result<()> {
        todo!()
    }
}
