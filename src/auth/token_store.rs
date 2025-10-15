use std::{
    fs::{self, OpenOptions},
    io::Write,
    os::unix::fs::OpenOptionsExt,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};

use crate::auth::Tokens;

pub trait TokenStore {
    fn save_tokens(&self, tokens: &Tokens) -> Result<()>;
    fn load_tokens(&self) -> Result<Option<Tokens>>;
    fn clear_tokens(&self) -> Result<()>;
}

pub struct FileTokenStore {
    path: PathBuf,
}

impl FileTokenStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path: path }
    }
}

impl TokenStore for FileTokenStore {
    fn save_tokens(&self, tokens: &Tokens) -> Result<()> {
        let data = serde_json::to_string_pretty(tokens).context("Failed to serialize tokens")?;

        let parent_dir = Path::new(&self.path)
            .parent()
            .context("Failed to get parent directory for auth token file path")?;

        if !parent_dir.exists() {
            fs::create_dir_all(parent_dir).with_context(|| {
                format!(
                    "Failed to create parent directory for auth token file: {}",
                    parent_dir.display()
                )
            })?;
        }

        let mut token_file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .mode(0o600) // rw------- permissions
            .open(&self.path)
            .with_context(|| {
                format!(
                    "Failed to open auth token file for writing: {}",
                    &self.path.display()
                )
            })?;

        token_file
            .write_all(data.as_bytes())
            .context("Failed to write auth data")
    }

    fn clear_tokens(&self) -> Result<()> {
        if Path::new(&self.path).exists() {
            fs::remove_file(&self.path).with_context(|| {
                format!("Failed to remove auth token file: {}", &self.path.display())
            })?;
        }
        Ok(())
    }

    fn load_tokens(&self) -> Result<Option<Tokens>> {
        if !Path::new(&self.path).exists() {
            return Ok(None);
        }

        let data = fs::read_to_string(&self.path)
            .with_context(|| format!("Failed to read auth tokens from {}", &self.path.display()))?;
        let tokens: Tokens = serde_json::from_str(&data).with_context(|| {
            format!("Failed to parse auth tokens from {}", &self.path.display())
        })?;

        Ok(Some(tokens))
    }
}
