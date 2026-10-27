use nasj_core::{analyze_file, AnalysisOptions, Severity};
use std::path::Path;

#[test]
fn optional_globs_are_info_with_private_context_and_missing_literal_is_an_error() {
    let path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/nginx/optional-includes.conf");
    let graph = analyze_file(&path, &AnalysisOptions::default()).unwrap();
    assert_eq!(graph.warnings.len(), 2);
    assert!(graph.warnings.iter().all(|d| d.code == "include.empty"
        && d.severity == Severity::Info
        && !d.severity.blocks_strict()));
    assert!(graph.warnings[0]
        .local_context
        .as_ref()
        .unwrap()
        .contains("optional-private-example-*.conf"));
    let temp = tempfile::tempdir().unwrap();
    let required = temp.path().join("required.conf");
    std::fs::write(&required, "include required-literal.conf;").unwrap();
    let error = analyze_file(&required, &AnalysisOptions::default()).unwrap_err();
    assert_eq!(error.severity(), Severity::Error);
    assert!(error.severity().blocks_strict());
}
