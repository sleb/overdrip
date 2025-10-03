use std::process;

use log::{debug, error};
use overdrip::Overdrip;

fn main() {
    env_logger::init();

    let overdrip = Overdrip::new(Default::default());
    if let Err(e) = overdrip.run() {
        error!("Error: {e}");
        debug!("Error: {e:?}");
        process::exit(1);
    }
}
