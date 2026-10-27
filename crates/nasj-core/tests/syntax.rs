use nasj_core::syntax::{parse, MAX_NESTING};

#[test]
fn sanitized_syntax_fixtures_preserve_structure_and_lines() {
    let tree = parse(
        include_str!("../../../fixtures/nginx/syntax/basic.conf"),
        "basic.conf",
    )
    .unwrap();
    assert_eq!(tree[0].name, "events");
    let http = tree[1].children.as_ref().unwrap();
    assert_eq!(http[0].name, "upstream");
    assert_eq!(http[0].source.line, 4);
    let server = http[1].children.as_ref().unwrap();
    assert_eq!(server[1].args, ["[::]:443", "ssl"]);
    assert_eq!(server[5].args, ["~", "^/v[0-9]{1,2}/"]);
    assert_eq!(
        server[6].children.as_ref().unwrap()[0].args,
        ["http://${backend}:8080$request_uri"]
    );
    assert!(parse(
        include_str!("../../../fixtures/nginx/syntax/extensions.conf"),
        "extensions.conf"
    )
    .is_ok());
}

#[test]
fn quoted_strings_and_nginx_escapes_are_decoded() {
    let tree = parse(
        include_str!("../../../fixtures/nginx/syntax/escaping.conf"),
        "escape.conf",
    )
    .unwrap();
    let server = tree[0].children.as_ref().unwrap()[0]
        .children
        .as_ref()
        .unwrap();
    assert_eq!(server[0].args, ["/srv/it's static"]);
    assert_eq!(server[1].args, ["~", r"^/a\d{2}/"]);
    assert_eq!(
        server[2].children.as_ref().unwrap()[0].args,
        ["200", "say \"hi\"\tend"]
    );
    assert_eq!(parse("root /a\\ b;", "x").unwrap()[0].args, [r"/a\ b"]);
    assert_eq!(
        parse("root \"نسج\";\r\nreturn 200;", "x").unwrap()[1]
            .source
            .line,
        2
    );
    assert_eq!(
        parse("return 302 https://example.test/a#b;#comment\n", "x").unwrap()[0].args[1],
        "https://example.test/a#b"
    );
}

#[test]
fn malformed_and_resource_exhaustion_inputs_fail_without_leaking_tokens() {
    let error = parse(
        include_str!("../../../fixtures/nginx/syntax/malformed.conf"),
        "bad.conf",
    )
    .unwrap_err();
    assert_eq!(error.code, "syntax.block");
    for source in [
        "root \"/srv\"suffix;",
        "root 'secret",
        "root secret",
        "}",
        ";",
        "root /x }",
        "root /x;\0",
    ] {
        let error = parse(source, "bad.conf").unwrap_err();
        assert!(!error.to_string().contains("secret"));
    }
    let deep = format!(
        "{}{}",
        "a {".repeat(MAX_NESTING + 1),
        "}".repeat(MAX_NESTING + 1)
    );
    assert_eq!(parse(&deep, "deep.conf").unwrap_err().code, "limit.nesting");
    assert_eq!(
        parse(&"a".repeat(nasj_core::syntax::MAX_FILE_BYTES + 1), "large")
            .unwrap_err()
            .code,
        "limit.bytes"
    );
}
