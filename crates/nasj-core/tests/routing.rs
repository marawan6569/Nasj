use nasj_core::{
    analyze_file, AnalysisOptions, Comparison, EdgeKind, Evidence, Node, NodeKind, Topology,
};
use std::path::Path;

fn map(name: &str) -> Topology {
    analyze_file(
        &Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../fixtures/nginx")
            .join(name),
        &AnalysisOptions::default(),
    )
    .unwrap()
}
fn node<'a>(graph: &'a Topology, label: &str) -> &'a Node {
    graph.nodes.iter().find(|n| n.label == label).unwrap()
}

#[test]
fn content_handlers_exclude_static_destinations_and_have_correct_nested_boundaries() {
    let graph = map("effective-handlers.conf");
    for label in [
        "location /api/",
        "location /api/explicit/",
        "location /php/",
        "location /php/explicit/",
        "location /uwsgi/",
        "location /scgi/",
        "location /grpc/",
        "location /dynamic/",
    ] {
        let owner = node(&graph, label);
        assert!(
            !graph
                .edges
                .iter()
                .any(|e| e.from == owner.id && e.kind == EdgeKind::BackedBy),
            "{label}"
        );
        assert_eq!(owner.attributes["configured_root"], "/srv/synthetic-www");
        if !label.starts_with("location /api/") {
            assert!(!graph
                .edges
                .iter()
                .any(|e| e.from == owner.id && e.kind == EdgeKind::ProxiesTo));
        }
    }
    for label in ["location /api/empty/", "location /php/static/"] {
        let owner = node(&graph, label);
        assert!(!graph
            .edges
            .iter()
            .any(|e| e.from == owner.id && e.kind == EdgeKind::ProxiesTo));
        assert!(graph
            .edges
            .iter()
            .any(|e| e.from == owner.id && e.kind == EdgeKind::BackedBy));
    }
}

#[test]
fn symbolic_conditional_redirect_has_guarded_true_and_fallback_outcomes_with_sources() {
    let graph = map("conditionals/redirect.conf");
    assert!(graph.warnings.is_empty(), "{:?}", graph.warnings);
    let condition = graph
        .nodes
        .iter()
        .find(|n| n.kind == NodeKind::Condition)
        .unwrap();
    assert_eq!(condition.source.as_ref().unwrap().line, 5);
    let expression = condition.condition.as_ref().unwrap();
    assert_eq!(expression.variable, "$host");
    assert_eq!(expression.value, "example.test");
    assert_eq!(expression.operator, Comparison::Equal);
    let yes = graph
        .edges
        .iter()
        .find(|e| e.from == condition.id && e.kind == EdgeKind::WhenTrue)
        .unwrap();
    let no = graph
        .edges
        .iter()
        .find(|e| e.from == condition.id && e.kind == EdgeKind::WhenFalse)
        .unwrap();
    let redirect = graph.nodes.iter().find(|n| n.id == yes.to).unwrap();
    assert_eq!(
        redirect.attributes["target_expression"],
        "https://$host$request_uri"
    );
    assert_eq!(redirect.attributes["destination_resolution"], "dynamic");
    assert_eq!(redirect.source.as_ref().unwrap().line, 6);
    let response = graph.nodes.iter().find(|n| n.id == no.to).unwrap();
    assert_eq!(response.kind, NodeKind::Response);
    assert_eq!(response.attributes["status"], "404");
    assert_eq!(response.source.as_ref().unwrap().line, 8);
    assert!(graph
        .edges
        .iter()
        .all(|e| e.evidence == Evidence::Configured));
    assert!(!graph.nodes.iter().any(|n| n.kind == NodeKind::Target));
    assert!(!graph.edges.iter().any(|e| e.kind == EdgeKind::RedirectsTo));
}

#[test]
fn rewrite_order_preserves_first_terminal_return_and_ordered_false_chain() {
    let graph = map("conditionals/ordered.conf");
    assert!(graph.warnings.is_empty(), "{:?}", graph.warnings);
    let conditions: Vec<_> = graph
        .nodes
        .iter()
        .filter(|n| n.kind == NodeKind::Condition)
        .collect();
    assert_eq!(conditions.len(), 2);
    assert!(graph.edges.iter().any(|e| e.from == conditions[0].id
        && e.to == conditions[1].id
        && e.kind == EdgeKind::WhenFalse));
    assert!(!graph
        .nodes
        .iter()
        .any(|n| n.label.contains("ignored.example")
            || n.attributes
                .get("status")
                .is_some_and(|s| s == "200" || s == "503")));
    assert_eq!(
        graph
            .nodes
            .iter()
            .filter(|n| n.kind == NodeKind::Response && n.attributes["status"] == "204")
            .count(),
        1
    );
}

#[test]
fn unsupported_conditions_remain_unresolved_without_false_actions_or_secrets() {
    let graph = map("conditionals/unsupported.conf");
    assert!(graph.warnings.iter().any(
        |w| w.code == "routing.unresolved" && w.message.contains("not a Nginx validity error")
    ));
    assert!(!graph.nodes.iter().any(|n| matches!(
        n.kind,
        NodeKind::Condition | NodeKind::Response | NodeKind::Redirect
    )));
    for owner in graph.nodes.iter().filter(|n| {
        n.attributes
            .get("routing")
            .is_some_and(|r| r == "unresolved")
    }) {
        assert!(!graph.edges.iter().any(|e| e.from == owner.id
            && matches!(
                e.kind,
                EdgeKind::BackedBy | EdgeKind::ProxiesTo | EdgeKind::WhenTrue
            )));
    }
    assert!(!format!("{graph:?}").contains("fixture-private-value"));
}

#[test]
fn missing_fallback_is_an_explicit_unresolved_location_selection_step() {
    let graph = map("conditionals/fallthrough.conf");
    assert!(graph
        .nodes
        .iter()
        .any(|n| n.kind == NodeKind::RoutingStep && n.attributes["routing"] == "unresolved"));
    assert!(graph
        .warnings
        .iter()
        .any(|w| w.code == "routing.fallthrough"));
    assert!(!graph.edges.iter().any(|e| e.kind == EdgeKind::ProxiesTo));
}

#[test]
fn inherited_error_page_prevents_claiming_a_terminal_fallback_response() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("inherited-error.conf");
    std::fs::write(&path,"http { error_page 404 /fallback; server { listen 80; if ($host = example.test) { return 301 https://$host$request_uri; } return 404; } }").unwrap();
    let graph = analyze_file(&path, &AnalysisOptions::default()).unwrap();
    assert!(graph
        .warnings
        .iter()
        .any(|d| d.code == "routing.unresolved"));
    assert!(!graph.nodes.iter().any(|n| matches!(
        n.kind,
        NodeKind::Redirect | NodeKind::Response | NodeKind::Condition
    )));
}
