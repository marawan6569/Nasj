//! Explicit maintainer utility. Review golden diffs after changing renderers.
use nasj_core::Topology;
use nasj_export::{render, Format};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures");
    let graph: Topology = serde_json::from_str(&std::fs::read_to_string(path.join("graph.json"))?)?;
    for (format, extension) in [
        (Format::Json, "json"),
        (Format::Dot, "dot"),
        (Format::Svg, "svg"),
    ] {
        std::fs::write(
            path.join(format!("graph.golden.{extension}")),
            render(&graph, format)?,
        )?;
    }
    Ok(())
}
