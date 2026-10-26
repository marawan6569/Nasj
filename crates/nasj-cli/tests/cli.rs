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
fn missing_map_and_invalid_arguments_fail_without_output() {
    let output = nasj(&["map", "--config", "missing.conf"]);
    assert!(!output.status.success());
    assert!(output.stdout.is_empty());
    assert!(String::from_utf8_lossy(&output.stderr).contains("input.path"));
    assert!(!nasj(&["demo", "--format", "bogus"]).status.success());
    assert!(!nasj(&["map"]).status.success());
}

#[test]
fn write_errors_are_reported() {
    let output = nasj(&["demo", "-o", "/nasj-nonexistent-directory/report.json"]);
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stderr).contains("cannot write"));
}

#[test]
fn real_map_writes_json_and_never_overwrites_any_existing_file() {
    let dir = tempfile::tempdir().unwrap();
    let config = dir.path().join("nginx.conf");
    let original =
        "http { server { listen 80; location / { proxy_pass http://127.0.0.1:8000; } } }";
    std::fs::write(&config, original).unwrap();
    let output = nasj(&["map", "--config", config.to_str().unwrap()]);
    assert!(output.status.success(), "{:?}", output.stderr);
    let graph: nasj_core::Topology = serde_json::from_slice(&output.stdout).unwrap();
    assert!(graph
        .nodes
        .iter()
        .any(|n| n.kind == nasj_core::NodeKind::Target));
    let output = nasj(&[
        "map",
        "--config",
        config.to_str().unwrap(),
        "-o",
        config.to_str().unwrap(),
    ]);
    assert!(!output.status.success());
    assert_eq!(std::fs::read_to_string(&config).unwrap(), original);
    std::fs::write(
        &config,
        "http { server { location / { proxy_pass http://$backend; } } }",
    )
    .unwrap();
    let output = nasj(&["map", "--config", config.to_str().unwrap(), "--strict"]);
    assert!(!output.status.success());
    assert!(output.stdout.is_empty());
}
