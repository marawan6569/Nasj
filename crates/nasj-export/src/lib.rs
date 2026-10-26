//! Portable, self-contained exporters consuming the same normalized model.
use nasj_core::Topology;
use std::{collections::BTreeSet, error::Error, fmt};

mod html;
mod svg;

#[derive(Debug, Clone, Copy)]
pub enum Format {
    Json,
    Dot,
    Svg,
    Html,
}

#[derive(Debug)]
pub enum ExportError {
    Json(serde_json::Error),
    InvalidTopology(&'static str),
}

impl fmt::Display for ExportError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Json(error) => error.fmt(f),
            Self::InvalidTopology(message) => f.write_str(message),
        }
    }
}
impl Error for ExportError {}
impl From<serde_json::Error> for ExportError {
    fn from(error: serde_json::Error) -> Self {
        Self::Json(error)
    }
}

pub fn render(topology: &Topology, format: Format) -> Result<String, ExportError> {
    let topology = nasj_core::redact::topology(topology);
    let mut ids = BTreeSet::new();
    for node in &topology.nodes {
        if !ids.insert(node.id.as_str()) {
            return Err(ExportError::InvalidTopology("duplicate topology node ID"));
        }
    }
    if topology
        .edges
        .iter()
        .any(|e| !ids.contains(e.from.as_str()) || !ids.contains(e.to.as_str()))
    {
        return Err(ExportError::InvalidTopology(
            "topology edge references a missing node",
        ));
    }
    match format {
        Format::Json => Ok(serde_json::to_string_pretty(&topology)?),
        Format::Dot => Ok(render_dot(&topology)),
        Format::Svg => Ok(svg::render(&topology)),
        Format::Html => html::render(&topology),
    }
}

fn escape_dot(s: &str) -> String {
    let mut escaped = String::new();
    for ch in s.chars() {
        match ch {
            '\\' => escaped.push_str("\\\\"),
            '"' => escaped.push_str("\\\""),
            '\n' => escaped.push_str("\\n"),
            '\r' => escaped.push_str("\\r"),
            '\t' => escaped.push(' '),
            ch if ch.is_control() => escaped.push('\u{fffd}'),
            ch => escaped.push(ch),
        }
    }
    escaped
}

fn render_dot(topology: &Topology) -> String {
    let mut output = String::from("digraph nasj {\n  rankdir=LR;\n");
    for node in &topology.nodes {
        output.push_str(&format!(
            "  \"{}\" [label=\"{}\"];\n",
            escape_dot(&node.id),
            escape_dot(&node.label)
        ));
    }
    for edge in &topology.edges {
        output.push_str(&format!(
            "  \"{}\" -> \"{}\" [label=\"{} ({})\"];\n",
            escape_dot(&edge.from),
            escape_dot(&edge.to),
            edge_label(&edge.kind),
            evidence_label(&edge.evidence),
        ));
    }
    if !topology.warnings.is_empty() {
        let warnings = topology
            .warnings
            .iter()
            .map(|w| format!("{}: {}", w.code, w.message))
            .collect::<Vec<_>>()
            .join("\n");
        output.push_str(&format!(
            "  graph [label=\"{}\", labelloc=b];\n",
            escape_dot(&warnings)
        ));
    }
    output.push_str("}\n");
    output
}

fn edge_label(kind: &nasj_core::EdgeKind) -> &'static str {
    use nasj_core::EdgeKind::*;
    match kind {
        ListensOn => "listens on",
        Contains => "contains",
        RoutesTo => "routes to",
        ProxiesTo => "proxies to",
        RedirectsTo => "redirects to",
        BackedBy => "backed by",
        Evaluates => "evaluates",
        WhenTrue => "true",
        WhenFalse => "false / otherwise",
        RespondsWith => "responds with",
    }
}

fn evidence_label(evidence: &nasj_core::Evidence) -> &'static str {
    use nasj_core::Evidence::*;
    match evidence {
        Configured => "configured",
        Synthetic => "synthetic",
        Inferred => "inferred",
        Confirmed => "confirmed",
        Unresolved => "unresolved",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use nasj_core::{Node, NodeKind};
    use std::collections::BTreeMap;
    #[test]
    fn json_has_schema_version() {
        assert!(render(&Topology::default(), Format::Json)
            .unwrap()
            .contains("schema_version"));
    }
    #[test]
    fn dot_escapes_quotes() {
        let mut graph = Topology::default();
        graph.nodes.push(Node {
            id: "id".into(),
            kind: NodeKind::Domain,
            label: "say \"hi\"".into(),
            source: None,
            attributes: BTreeMap::new(),
            condition: None,
        });
        assert!(render(&graph, Format::Dot).unwrap().contains("\\\"hi\\\""));
    }
}
