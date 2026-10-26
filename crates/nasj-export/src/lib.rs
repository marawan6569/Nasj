//! Portable topology exporters (JSON and DOT bootstrap only).
use nasj_core::Topology;

#[derive(Debug, Clone, Copy)]
pub enum Format { Json, Dot }

pub fn render(topology: &Topology, format: Format) -> Result<String, serde_json::Error> {
    match format {
        Format::Json => serde_json::to_string_pretty(topology),
        Format::Dot => Ok(render_dot(topology)),
    }
}

fn escape_dot(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"").replace('\n', "\\n").replace('\r', "\\r")
}

fn render_dot(topology: &Topology) -> String {
    let mut output = String::from("digraph nasj {\n  rankdir=LR;\n");
    for node in &topology.nodes {
        output.push_str(&format!("  \"{}\" [label=\"{}\"];\n", escape_dot(&node.id), escape_dot(&node.label)));
    }
    for edge in &topology.edges {
        output.push_str(&format!("  \"{}\" -> \"{}\" [label=\"{:?}\"];\n", escape_dot(&edge.from), escape_dot(&edge.to), edge.kind));
    }
    output.push_str("}\n");
    output
}

#[cfg(test)]
mod tests {
    use super::*;
    use nasj_core::{Node, NodeKind};
    use std::collections::BTreeMap;
    #[test]
    fn json_has_schema_version() {
        assert!(render(&Topology::default(), Format::Json).unwrap().contains("schema_version"));
    }
    #[test]
    fn dot_escapes_quotes() {
        let mut graph = Topology::default();
        graph.nodes.push(Node {
            id: "id".into(), kind: NodeKind::Domain, label: "say \"hi\"".into(),
            source: None, attributes: BTreeMap::new(),
        });
        assert!(render(&graph, Format::Dot).unwrap().contains("\\\"hi\\\""));
    }
}
