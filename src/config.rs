#[derive(Debug)]
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

#[derive(Debug)]
pub struct ServerConfig {
    pub port: u16,
}

impl Default for ServerConfig {
    fn default() -> Self {
        ServerConfig { port: 8080 }
    }
}

#[derive(Default, Debug)]
pub struct Config {
    pub monitor: MonitorConfig,
    pub server: ServerConfig,
}
