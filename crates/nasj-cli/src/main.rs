use clap::{Parser, Subcommand, ValueEnum};
use nasj_core::{
    analyze_file, AnalysisKind, AnalysisOptions, Edge, EdgeKind, Evidence, Node, NodeKind, Topology,
};
use nasj_export::{render, Format};
use std::{collections::BTreeMap, io::Write, path::PathBuf, process::ExitCode};

#[derive(Parser)]
#[command(name = "nasj", about = "Weave infrastructure into clarity.", version)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Render synthetic example topology (implemented).
    Demo {
        #[arg(short, long, value_enum, default_value_t = OutputFormat::Json)]
        format: OutputFormat,
        #[arg(short, long)]
        output: Option<PathBuf>,
    },
    /// Map Nginx HTTP configuration and its declared includes (read-only).
    Map {
        #[arg(long)]
        config: PathBuf,
        /// Nginx configuration prefix (default: root configuration directory).
        #[arg(long)]
        prefix: Option<PathBuf>,
        /// Permit declared includes outside the configuration prefix.
        #[arg(long)]
        allow_external_includes: bool,
        /// Fail without writing a report if analysis emits any warnings.
        #[arg(long)]
        strict: bool,
        #[arg(short, long, value_enum, default_value_t = OutputFormat::Json)]
        format: OutputFormat,
        #[arg(short, long)]
        output: Option<PathBuf>,
    },
}

#[derive(Clone, Copy, Debug, ValueEnum)]
enum OutputFormat {
    Json,
    Dot,
}
impl From<OutputFormat> for Format {
    fn from(value: OutputFormat) -> Self {
        match value {
            OutputFormat::Json => Format::Json,
            OutputFormat::Dot => Format::Dot,
        }
    }
}

fn demo_graph() -> Topology {
    let mut graph = Topology {
        analysis: AnalysisKind::Synthetic,
        ..Topology::default()
    };
    for (id, kind, label) in [
        ("domain", NodeKind::Domain, "api.example.com"),
        ("location", NodeKind::Location, "location /api"),
        ("upstream", NodeKind::Target, "127.0.0.1:8000"),
    ] {
        graph.nodes.push(Node {
            id: id.into(),
            kind,
            label: label.into(),
            source: None,
            attributes: BTreeMap::new(),
        });
    }
    graph.edges.push(Edge {
        from: "domain".into(),
        to: "location".into(),
        kind: EdgeKind::RoutesTo,
        source: None,
        evidence: Evidence::Synthetic,
    });
    graph.edges.push(Edge {
        from: "location".into(),
        to: "upstream".into(),
        kind: EdgeKind::ProxiesTo,
        source: None,
        evidence: Evidence::Synthetic,
    });
    graph
}

fn run() -> Result<(), String> {
    let cli = Cli::parse();
    let (graph, format, output) = match cli.command {
        Command::Demo { format, output } => (demo_graph(), format, output),
        Command::Map {
            config,
            prefix,
            allow_external_includes,
            strict,
            format,
            output,
        } => {
            let graph = analyze_file(
                &config,
                &AnalysisOptions {
                    prefix,
                    allow_external_includes,
                },
            )
            .map_err(|error| error.to_string())?;
            if strict && !graph.warnings.is_empty() {
                return Err(format!(
                    "analysis emitted {} warning(s); strict mode wrote no report",
                    graph.warnings.len()
                ));
            }
            (graph, format, output)
        }
    };
    let result = render(&graph, format.into()).map_err(|e| e.to_string())?;
    if let Some(path) = output {
        // Never overwrite an input, an include, or an existing report/symlink.
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)
            .map_err(|e| {
                format!(
                    "cannot write {}: {e}",
                    path.display().to_string().escape_debug()
                )
            })?;
        file.write_all(result.as_bytes())
            .map_err(|e| format!("cannot write report: {e}"))
    } else {
        match std::io::stdout().lock().write_all(result.as_bytes()) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::BrokenPipe => Ok(()),
            Err(error) => Err(format!("cannot write stdout: {error}")),
        }
    }
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("nasj: {e}");
            ExitCode::FAILURE
        }
    }
}
