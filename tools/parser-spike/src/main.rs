use misc_conf::{
    ast::{Directive, DirectiveTrait},
    nginx::Nginx,
};

fn main() {
    for (name, source) in [
        (
            "basic",
            include_str!("../../../fixtures/nginx/syntax/basic.conf"),
        ),
        (
            "extensions",
            include_str!("../../../fixtures/nginx/syntax/extensions.conf"),
        ),
        (
            "escaping",
            include_str!("../../../fixtures/nginx/syntax/escaping.conf"),
        ),
        (
            "malformed",
            include_str!("../../../fixtures/nginx/syntax/malformed.conf"),
        ),
        ("quote-adjacency", "root \"/srv\"suffix;"),
        ("crlf", "http {\r\n server { listen 80; }\r\n}"),
    ] {
        let typed = nginx_config::parse_main(source).is_ok();
        let lint = nginx_lint_parser::parse_string(source).is_ok();
        let misc = Directive::<Nginx>::parse(source.as_bytes()).is_ok();
        println!("{name}: nginx-config={typed} nginx-lint-parser={lint} misc-conf={misc}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn comparison_exposes_generic_directive_and_validation_gaps() {
        let extensions = include_str!("../../../fixtures/nginx/syntax/extensions.conf");
        assert!(nginx_config::parse_main(extensions).is_err());
        assert!(nginx_lint_parser::parse_string(extensions).is_ok());
        assert!(Directive::<Nginx>::parse(extensions.as_bytes()).is_ok());
        // Nginx requires a delimiter after a token's closing quote.
        assert!(nginx_lint_parser::parse_string("root \"/srv\"suffix;").is_ok());
    }
}
