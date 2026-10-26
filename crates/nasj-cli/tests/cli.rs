use std::process::Command;

fn nasj(args: &[&str]) -> std::process::Output {
    Command::new(env!("CARGO_BIN_EXE_nasj"))
        .args(args)
        .output()
        .unwrap()
}

#[test]
fn demo_is_a_valid_graph_and_dot_is_available() {
    let output = nasj(&["demo"]);
    assert!(output.status.success());
    let graph: nasj_core::Topology = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(graph.nodes.len(), 3);
    assert_eq!(graph.edges.len(), 2);
    assert!(graph
        .edges
        .iter()
        .all(|edge| graph.nodes.iter().any(|node| node.id == edge.to)));
    let output = nasj(&["demo", "--format", "dot"]);
    assert!(output.status.success());
    assert!(output.stdout.starts_with(b"digraph nasj {"));
}

#[test]
fn unsupported_map_and_invalid_arguments_fail_without_output() {
    let output = nasj(&["map", "--config", "missing.conf"]);
    assert!(!output.status.success());
    assert!(output.stdout.is_empty());
    assert!(String::from_utf8_lossy(&output.stderr).contains("not implemented"));
    assert!(!nasj(&["demo", "--format", "bogus"]).status.success());
    assert!(!nasj(&["map"]).status.success());
}

#[test]
fn write_errors_are_reported() {
    let output = nasj(&["demo", "-o", "/nasj-nonexistent-directory/report.json"]);
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stderr).contains("cannot write"));
}
