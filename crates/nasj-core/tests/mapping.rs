use nasj_core::{
    analyze_file, AnalysisKind, AnalysisOptions, EdgeKind, Evidence, NodeKind, Topology,
};
use std::{
    fs,
    path::{Path, PathBuf},
};

fn fixture(path: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures/nginx")
        .join(path)
}
fn map(path: &Path) -> Topology {
    analyze_file(path, &AnalysisOptions::default()).unwrap()
}

#[test]
fn real_pipeline_maps_listeners_domains_locations_and_upstreams_with_provenance() {
    let path = fixture("topology/nginx.conf");
    let graph = map(&path);
    assert_eq!(map(&path), graph);
    assert_eq!(graph.analysis, AnalysisKind::Configuration);
    assert_eq!(graph.sources.len(), 5);
    assert!(graph
        .edges
        .iter()
        .all(|edge| edge.evidence == Evidence::Configured));
    let upstream = graph
        .nodes
        .iter()
        .find(|n| n.kind == NodeKind::Upstream)
        .unwrap();
    assert_eq!(
        graph
            .edges
            .iter()
            .filter(|e| e.from == upstream.id && e.kind == EdgeKind::BackedBy)
            .count(),
        2
    );
    let member = graph
        .nodes
        .iter()
        .find(|n| n.label == "[::1]:8001")
        .unwrap();
    assert!(member
        .source
        .as_ref()
        .unwrap()
        .path
        .ends_with("snippets/members.conf"));
    assert_eq!(member.source.as_ref().unwrap().line, 2);
    let listener = graph.nodes.iter().find(|n| n.label == "[::]:443").unwrap();
    assert_eq!(listener.attributes["protocol"], "https");
    assert_eq!(listener.attributes["port"], "443");
    assert_eq!(
        graph
            .nodes
            .iter()
            .filter(|n| n.kind == NodeKind::Domain)
            .count(),
        2
    );
    assert!(graph
        .nodes
        .iter()
        .any(|n| n.attributes.get("match").is_some_and(|v| v == "regex")));
    let api = graph
        .nodes
        .iter()
        .find(|n| n.label == "location /api")
        .unwrap();
    assert!(graph
        .edges
        .iter()
        .any(|e| e.from == api.id && e.to == upstream.id && e.kind == EdgeKind::ProxiesTo));
    let alias = graph
        .nodes
        .iter()
        .find(|n| n.label.starts_with("location ~ "))
        .unwrap();
    let paths: Vec<_> = graph
        .edges
        .iter()
        .filter(|e| e.from == alias.id && e.kind == EdgeKind::BackedBy)
        .collect();
    assert_eq!(paths.len(), 1);
    assert_eq!(
        graph
            .nodes
            .iter()
            .find(|n| n.id == paths[0].to)
            .unwrap()
            .attributes["directive"],
        "alias"
    );
    let nested = graph
        .nodes
        .iter()
        .find(|n| n.label == "location /nested/child")
        .unwrap();
    assert!(graph
        .edges
        .iter()
        .any(|e| e.from == nested.id && e.to == upstream.id && e.kind == EdgeKind::ProxiesTo));
    let debug = format!("{graph:?}");
    assert!(!debug.contains("fixture-secret"));
    assert!(!debug.contains("private response body"));
}

#[test]
fn dynamic_and_conditional_destinations_have_diagnostics_and_no_proxy_edges() {
    for (path, labels) in [
        (
            "topology/nginx.conf",
            vec!["location /dynamic", "location /conditional"],
        ),
        (
            "uncertain.conf",
            vec![
                "location /ambiguous",
                "location /var",
                "location /rewrite",
                "location /try",
                "location /secret",
                "location /fastcgi",
            ],
        ),
    ] {
        let graph = map(&fixture(path));
        for label in labels {
            let node = graph.nodes.iter().find(|node| node.label == label).unwrap();
            assert_eq!(
                node.attributes.get("routing").map(String::as_str),
                Some("unresolved")
            );
            assert!(!graph
                .edges
                .iter()
                .any(|edge| edge.from == node.id && edge.kind == EdgeKind::ProxiesTo));
        }
        assert!(graph
            .warnings
            .iter()
            .any(|w| w.code == "routing.unresolved"));
        assert!(!graph
            .nodes
            .iter()
            .any(|n| n.label.contains("not-effective") || n.label.contains("do-not-confirm")));
    }
}

#[test]
fn includes_detect_cycles_missing_files_empty_globs_and_repeat_without_cycles() {
    assert_eq!(
        analyze_file(&fixture("cycle/nginx.conf"), &AnalysisOptions::default())
            .unwrap_err()
            .code,
        "include.cycle"
    );
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().join("nginx.conf");
    fs::write(&root, "http { include missing.conf; }").unwrap();
    assert_eq!(
        analyze_file(&root, &AnalysisOptions::default())
            .unwrap_err()
            .code,
        "input.path"
    );
    fs::write(&root, "http { include missing/*.conf; }").unwrap();
    assert_eq!(map(&root).warnings[0].code, "include.empty");
    fs::write(&root, "http { include part.conf; include part.conf; }").unwrap();
    fs::write(dir.path().join("part.conf"), "server { listen 80; }").unwrap();
    assert_eq!(
        map(&root)
            .nodes
            .iter()
            .filter(|n| n.kind == NodeKind::Server)
            .count(),
        2
    );
    fs::write(&root, "http { include $path; }").unwrap();
    assert_eq!(
        analyze_file(&root, &AnalysisOptions::default())
            .unwrap_err()
            .code,
        "include.dynamic"
    );
}

#[test]
fn include_scope_encoding_and_special_inputs_are_checked() {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir(dir.path().join("conf")).unwrap();
    let root = dir.path().join("conf/nginx.conf");
    fs::write(&root, "http { include ../outside.conf; }").unwrap();
    fs::write(dir.path().join("outside.conf"), "server { listen 80; }").unwrap();
    assert_eq!(
        analyze_file(&root, &AnalysisOptions::default())
            .unwrap_err()
            .code,
        "include.scope"
    );
    let options = AnalysisOptions {
        allow_external_includes: true,
        ..AnalysisOptions::default()
    };
    assert!(analyze_file(&root, &options).is_ok());
    fs::write(&root, [0xff, 0xfe]).unwrap();
    assert_eq!(
        analyze_file(&root, &options).unwrap_err().code,
        "input.encoding"
    );
    assert_eq!(
        analyze_file(dir.path(), &options).unwrap_err().code,
        "input.type"
    );
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(
            dir.path().join("outside.conf"),
            dir.path().join("conf/linked.conf"),
        )
        .unwrap();
        fs::write(&root, "http { include linked.conf; }").unwrap();
        assert_eq!(
            analyze_file(&root, &AnalysisOptions::default())
                .unwrap_err()
                .code,
            "include.scope"
        );
    }
}

#[test]
fn excessive_include_depth_and_malformed_input_fail_closed() {
    let dir = tempfile::tempdir().unwrap();
    for n in 0..34 {
        fs::write(
            dir.path().join(format!("{n}.conf")),
            format!("include {}.conf;", n + 1),
        )
        .unwrap();
    }
    assert_eq!(
        analyze_file(&dir.path().join("0.conf"), &AnalysisOptions::default())
            .unwrap_err()
            .code,
        "limit.includes"
    );
    assert_eq!(
        analyze_file(
            &fixture("syntax/malformed.conf"),
            &AnalysisOptions::default()
        )
        .unwrap_err()
        .code,
        "syntax.block"
    );
}

#[test]
fn unix_proxy_socket_is_not_misread_as_a_hostname() {
    let graph = map(&fixture("unix.conf"));
    assert!(graph.warnings.is_empty(), "{:?}", graph.warnings);
    assert_eq!(
        graph
            .nodes
            .iter()
            .filter(|n| n.kind == NodeKind::Target && n.label == "unix:/run/example.sock")
            .count(),
        2
    );
    assert!(!graph.nodes.iter().any(|n| n.label == "unix"));
}

#[cfg(unix)]
#[test]
fn unreadable_includes_and_fifo_inputs_fail_without_blocking() {
    use std::os::unix::fs::PermissionsExt;
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().join("nginx.conf");
    let included = dir.path().join("private.conf");
    fs::write(&root, "http { include private.conf; }").unwrap();
    fs::write(&included, "server { listen 80; }").unwrap();
    fs::set_permissions(&included, fs::Permissions::from_mode(0o000)).unwrap();
    // Root test runners can still read mode-000 files; the normal user path
    // must produce a structured input.read diagnostic.
    if fs::read(&included).is_err() {
        assert_eq!(
            analyze_file(&root, &AnalysisOptions::default())
                .unwrap_err()
                .code,
            "input.read"
        );
    }
    let fifo = dir.path().join("input.fifo");
    assert!(std::process::Command::new("mkfifo")
        .arg(&fifo)
        .status()
        .unwrap()
        .success());
    assert_eq!(
        analyze_file(&fifo, &AnalysisOptions::default())
            .unwrap_err()
            .code,
        "input.type"
    );
}
