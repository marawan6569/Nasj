//! Shared topology model. No live server inspection is performed.
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

mod analyze;
pub mod config;
pub mod redact;
pub mod syntax;

pub use config::{analyze_file, AnalysisOptions};

pub const SCHEMA_VERSION: &str = "0.1";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeKind {
    Domain,
    Listener,
    Server,
    Location,
    Upstream,
    Target,
    StaticRoot,
    Redirect,
    Container,
    Service,
    Process,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EdgeKind {
    ListensOn,
    Contains,
    RoutesTo,
    ProxiesTo,
    RedirectsTo,
    BackedBy,
}

/// Evidence is separate from graph connectivity. Static analysis never emits
/// runtime `confirmed` relationships.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Evidence {
    #[default]
    Configured,
    Synthetic,
    Inferred,
    Confirmed,
    Unresolved,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnalysisKind {
    #[default]
    Configuration,
    Synthetic,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceLocation {
    pub path: String,
    pub line: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Node {
    pub id: String,
    pub kind: NodeKind,
    pub label: String,
    pub source: Option<SourceLocation>,
    #[serde(default)]
    pub attributes: BTreeMap<String, String>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Edge {
    pub from: String,
    pub to: String,
    pub kind: EdgeKind,
    pub source: Option<SourceLocation>,
    #[serde(default)]
    pub evidence: Evidence,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Warning {
    pub code: String,
    pub message: String,
    pub source: Option<SourceLocation>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Topology {
    pub schema_version: String,
    #[serde(default)]
    pub analysis: AnalysisKind,
    #[serde(default)]
    pub sources: Vec<String>,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
    pub warnings: Vec<Warning>,
}
impl Default for Topology {
    fn default() -> Self {
        Self {
            schema_version: SCHEMA_VERSION.to_owned(),
            analysis: AnalysisKind::Configuration,
            sources: Vec::new(),
            nodes: Vec::new(),
            edges: Vec::new(),
            warnings: Vec::new(),
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn default_topology_is_empty_and_versioned() {
        let graph = Topology::default();
        assert_eq!(graph.schema_version, "0.1");
        assert!(graph.nodes.is_empty());
    }
}
