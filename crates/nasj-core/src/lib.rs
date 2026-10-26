//! Shared topology model. No live server inspection is performed.
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const SCHEMA_VERSION: &str = "0.1";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeKind { Domain, Listener, Server, Location, Upstream, Target, StaticRoot, Redirect, Container, Service, Process }

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EdgeKind { ListensOn, Contains, RoutesTo, ProxiesTo, RedirectsTo, BackedBy }

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceLocation { pub path: String, pub line: usize }

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
pub struct Edge { pub from: String, pub to: String, pub kind: EdgeKind, pub source: Option<SourceLocation> }
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Warning { pub code: String, pub message: String, pub source: Option<SourceLocation> }
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Topology {
    pub schema_version: String,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
    pub warnings: Vec<Warning>,
}
impl Default for Topology {
    fn default() -> Self {
        Self { schema_version: SCHEMA_VERSION.to_owned(), nodes: Vec::new(), edges: Vec::new(), warnings: Vec::new() }
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
