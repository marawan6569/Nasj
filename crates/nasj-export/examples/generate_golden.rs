//! Explicit maintainer utility. Review golden diffs after changing renderers.
use nasj_core::Topology;
use nasj_export::{render, Format};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures");
    let graph: Topology = serde_json::from_str(&std::fs::read_to_string(path.join("graph.json"))?)?;
    let config = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures/nginx/conditionals/redirect.conf");
    let mut conditional = nasj_core::analyze_file(&config, &nasj_core::AnalysisOptions::default())?;
    conditional.sources = vec!["fixtures/conditional.conf".into()];
    for node in &mut conditional.nodes {
        if let Some(source) = &mut node.source {
            source.path = "fixtures/conditional.conf".into();
        }
    }
    for edge in &mut conditional.edges {
        if let Some(source) = &mut edge.source {
            source.path = "fixtures/conditional.conf".into();
        }
    }
    for (name, graph) in [("graph", graph), ("conditional", conditional)] {
        for (format, extension) in [
            (Format::Json, "json"),
            (Format::Dot, "dot"),
            (Format::Svg, "svg"),
        ] {
            std::fs::write(
                path.join(format!("{name}.golden.{extension}")),
                render(&graph, format)?,
            )?;
        }
    }
    Ok(())
}
