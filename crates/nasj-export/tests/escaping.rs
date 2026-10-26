use nasj_core::Topology;
use nasj_export::{render, Format};

#[test]
fn hostile_fixture_round_trips_json_and_stays_inside_dot_strings() {
    let graph: Topology = serde_json::from_str(include_str!("fixtures/escaping.json")).unwrap();
    let json = render(&graph, Format::Json).unwrap();
    assert_eq!(serde_json::from_str::<Topology>(&json).unwrap(), graph);
    assert_eq!(render(&graph, Format::Json).unwrap(), json);
    let dot = render(&graph, Format::Dot).unwrap();
    assert!(dot.contains(
        r#""id\"; evil -> target; //" [label="say \"hi\"\n\\N\r �<svg onload=alert(1)> نسج"];"#
    ));
    assert_eq!(dot.lines().count(), 4);
    assert!(!dot.contains('\0'));
}
