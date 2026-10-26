use nasj_core::redact;

#[test]
fn url_secrets_are_removed_and_repeated_sanitization_is_stable() {
    for input in [
        "https://user:password@example.test/path?token=secret#fragment",
        "https://example.test/path#secret",
        "https://example.test?secret",
    ] {
        let output = redact::text(input);
        assert!(!output.contains("password"));
        assert!(!output.contains("secret"));
        assert!(!output.contains("fragment"));
        assert_eq!(redact::text(&output), output);
    }
    assert_eq!(redact::text("/srv/static"), "/srv/static");
    assert!(redact::sensitive_key("Authorization"));
}
