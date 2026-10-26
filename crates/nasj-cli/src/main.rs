use clap::{Parser, Subcommand, ValueEnum};
use nasj_core::{Edge, EdgeKind, Node, NodeKind, Topology};
use nasj_export::{render, Format};
use std::{collections::BTreeMap, path::PathBuf, process::ExitCode};

#[derive(Parser)]
#[command(name = "nasj", about = "Weave infrastructure into clarity.", version)]
struct Cli { #[command(subcommand)] command: Command }

#[derive(Subcommand)]
enum Command {
    /// Render synthetic example topology (implemented).
    Demo {
        #[arg(short, long, value_enum, default_value_t = OutputFormat::Json)]
        format: OutputFormat,
        #[arg(short, long)]
        output: Option<PathBuf>,
    },
    /// Parse Nginx configuration (not implemented yet).
    Map {
        #[arg(long)]
        config: PathBuf,
        #[arg(short, long, value_enum, default_value_t = OutputFormat::Json)]
        format: OutputFormat,
        #[arg(short, long)]
        output: Option<PathBuf>,
    },
}

#[derive(Clone, Copy, Debug, ValueEnum)]
enum OutputFormat { Json, Dot }
impl From<OutputFormat> for Format {
    fn from(value: OutputFormat) -> Self {
        match value { OutputFormat::Json => Format::Json, OutputFormat::Dot => Format::Dot }
    }
}

fn demo_graph() -> Topology {
    let mut graph = Topology::default();
    for (id, kind, label) in [
        ("domain", NodeKind::Domain, "api.example.com"),
        ("location", NodeKind::Location, "location /api"),
        ("upstream", NodeKind::Target, "127.0.0.1:8000"),
    ] {
        graph.nodes.push(Node {
            id: id.into(), kind, label: label.into(),
            source: None, attributes: BTreeMap::new(),
        });
    }
    graph.edges.push(Edge {
        from: "domain".into(), to: "location".into(), kind: EdgeKind::RoutesTo, source: None,
    });
    graph.edges.push(Edge {
        from: "location".into(), to: "upstream".into(), kind: EdgeKind::ProxiesTo, source: None,
    });
    graph
}

fn run() -> Result<(), String> {
    let cli = Cli::parse();
    let (format, output) = match cli.command {
        Command::Demo { format, output } => (format, output),
        Command::Map { config, .. } => {
            return Err(format!("Nginx parsing is not implemented yet: {}", config.display()));
        }
    };
    let result = render(&demo_graph(), format.into()).map_err(|e| e.to_string())?;
    if let Some(path) = output {
        std::fs::write(&path, result).map_err(|e| format!("cannot write {}: {e}", path.display()))
    } else {
        print!("{result}");
        Ok(())
    }
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => { eprintln!("nasj: {e}"); ExitCode::FAILURE }
    }
}
