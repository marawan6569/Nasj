use nasj_core::{analyze_file, AnalysisOptions, Edge, EdgeKind, Evidence, Topology};
use nasj_export::{render, Format};
use std::path::Path;

fn graph() -> Topology {
    serde_json::from_str(include_str!("fixtures/graph.json")).unwrap()
}

#[test]
fn deterministic_json_dot_and_svg_match_reviewed_golden_files() {
    for (format, expected) in [
        (Format::Json, include_str!("fixtures/graph.golden.json")),
        (Format::Dot, include_str!("fixtures/graph.golden.dot")),
        (Format::Svg, include_str!("fixtures/graph.golden.svg")),
    ] {
        let output = render(&graph(), format).unwrap();
        assert_eq!(output.trim_end(), expected.trim_end());
        assert_eq!(render(&graph(), format).unwrap(), output);
    }
}

#[test]
fn hostile_configuration_is_inert_and_secrets_are_omitted_in_every_format() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/nginx/hostile.conf");
    let graph = analyze_file(&path, &AnalysisOptions::default()).unwrap();
    for format in [Format::Json, Format::Dot, Format::Svg, Format::Html] {
        let output = render(&graph, format).unwrap();
        for secret in [
            "fixture-secret",
            "fixture-query",
            "fixture-fragment",
            "fixture-response-secret",
            "fixture-header-secret",
        ] {
            assert!(!output.contains(secret));
        }
    }
    let html = render(&graph, Format::Html).unwrap();
    assert_eq!(html.matches("</script>").count(), 2);
    assert!(!html.contains("<img src=x"));
    assert!(html.contains("\\u003c/script\\u003e"));
    assert!(html.contains("connect-src 'none'"));
    assert!(!html.contains("<script src="));
    let svg = render(&graph, Format::Svg).unwrap();
    assert!(!svg.contains("<script>"));
    assert!(svg.contains("&lt;/script&gt;"));
}

#[test]
fn invalid_graphs_fail_and_empty_or_cyclic_graphs_render_finitely() {
    let mut invalid = graph();
    invalid.nodes.push(invalid.nodes[0].clone());
    assert!(render(&invalid, Format::Html).is_err());
    let mut invalid = graph();
    invalid.edges[0].to = "missing".into();
    assert!(render(&invalid, Format::Svg).is_err());
    for format in [Format::Json, Format::Dot, Format::Svg, Format::Html] {
        assert!(render(&Topology::default(), format).is_ok());
    }
    let mut cycle = graph();
    cycle.edges.push(Edge {
        from: "target".into(),
        to: "domain".into(),
        kind: EdgeKind::RoutesTo,
        source: None,
        evidence: Evidence::Configured,
    });
    assert!(render(&cycle, Format::Svg).unwrap().len() < 20000);
}

#[test]
fn exporter_redacts_sensitive_attributes_from_public_model_callers() {
    let mut graph = graph();
    graph.nodes[0]
        .attributes
        .insert("Authorization".into(), "fixture-auth-secret".into());
    graph.nodes[1].label =
        "https://user:fixture-user-secret@example.test/path?key=fixture-key-secret".into();
    for format in [Format::Json, Format::Dot, Format::Svg, Format::Html] {
        let output = render(&graph, format).unwrap();
        assert!(!output.contains("fixture-auth-secret"));
        assert!(!output.contains("fixture-user-secret"));
        assert!(!output.contains("fixture-key-secret"));
    }
}

#[test]
fn legacy_graphs_without_provenance_are_never_labeled_configured() {
    let mut value = serde_json::to_value(graph()).unwrap();
    value.as_object_mut().unwrap().remove("analysis");
    for edge in value["edges"].as_array_mut().unwrap() {
        edge.as_object_mut().unwrap().remove("evidence");
    }
    let graph: Topology = serde_json::from_value(value).unwrap();
    assert_eq!(graph.analysis, nasj_core::AnalysisKind::Unknown);
    assert!(graph
        .edges
        .iter()
        .all(|edge| edge.evidence == Evidence::Unresolved));
    assert!(render(&graph, Format::Html)
        .unwrap()
        .contains("Unknown provenance"));
    assert!(render(&graph, Format::Svg)
        .unwrap()
        .contains("provenance unknown"));
}

#[test]
fn conditional_control_flow_has_shared_json_dot_svg_goldens_and_html_metadata() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures/nginx/conditionals/redirect.conf");
    let mut graph = analyze_file(&path, &AnalysisOptions::default()).unwrap();
    graph.sources = vec!["fixtures/conditional.conf".into()];
    for node in &mut graph.nodes {
        if let Some(source) = &mut node.source {
            source.path = "fixtures/conditional.conf".into();
        }
    }
    for edge in &mut graph.edges {
        if let Some(source) = &mut edge.source {
            source.path = "fixtures/conditional.conf".into();
        }
    }
    for (format, expected) in [
        (
            Format::Json,
            include_str!("fixtures/conditional.golden.json"),
        ),
        (Format::Dot, include_str!("fixtures/conditional.golden.dot")),
        (Format::Svg, include_str!("fixtures/conditional.golden.svg")),
    ] {
        assert_eq!(
            render(&graph, format).unwrap().trim_end(),
            expected.trim_end()
        );
    }
    let html = render(&graph, Format::Html).unwrap();
    assert!(html.contains("https://$host$request_uri"));
    assert!(html.contains("Symbolic condition"));
}

#[test]
fn diagnostic_severity_survives_reports_but_private_glob_context_never_does() {
    let path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/nginx/optional-includes.conf");
    let graph = analyze_file(&path, &AnalysisOptions::default()).unwrap();
    for format in [Format::Json, Format::Dot, Format::Svg, Format::Html] {
        let output = render(&graph, format).unwrap();
        assert!(output.contains("info"));
        assert!(output.contains("include.empty"));
        assert!(!output.contains("optional-private-example-*.conf"));
        assert!(!output.contains("local_context"));
    }
    let legacy: Topology = serde_json::from_str(include_str!("fixtures/graph.json")).unwrap();
    assert_eq!(legacy.warnings[0].severity, nasj_core::Severity::Warning);
}
