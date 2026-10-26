//! Defense in depth for allowlisted report data, not arbitrary secret detection.
use crate::Topology;

pub fn sensitive_key(key: &str) -> bool {
    let key = key.to_ascii_lowercase();
    [
        "password",
        "passwd",
        "secret",
        "token",
        "authorization",
        "cookie",
        "credential",
        "api_key",
        "private_key",
    ]
    .iter()
    .any(|part| key.contains(part))
}

/// Remove userinfo and all URL query/fragment contents. Paths, domain names and
/// source paths remain infrastructure information and require review to share.
pub fn text(input: &str) -> String {
    let mut output = String::new();
    let mut remaining = input;
    while let Some(scheme) = remaining.find("://") {
        let authority_start = scheme + 3;
        output.push_str(&remaining[..authority_start]);
        let end = remaining[authority_start..]
            .find(|ch: char| ch.is_whitespace() || matches!(ch, '"' | '\'' | '<' | '>'))
            .map_or(remaining.len(), |i| authority_start + i);
        let url = &remaining[authority_start..end];
        let authority_end = url.find(['/', '?', '#']).unwrap_or(url.len());
        let authority = &url[..authority_end];
        if let Some(at) = authority.rfind('@') {
            output.push_str("[redacted]@");
            output.push_str(&authority[at + 1..]);
        } else {
            output.push_str(authority);
        }
        let tail = &url[authority_end..];
        if let Some(cut) = tail.find(['?', '#']) {
            output.push_str(&tail[..cut]);
            output.push_str("[redacted]");
        } else {
            output.push_str(tail);
        }
        remaining = &remaining[end..];
    }
    output.push_str(remaining);
    output
}

pub fn topology(input: &Topology) -> Topology {
    let mut graph = input.clone();
    for node in &mut graph.nodes {
        node.id = text(&node.id);
        node.label = text(&node.label);
        if let Some(condition) = &mut node.condition {
            let value = if sensitive_key(&condition.variable) {
                "[redacted]".into()
            } else {
                text(&condition.value)
            };
            condition.value_redacted |= value != condition.value;
            condition.value = value;
        }
        for (key, value) in &mut node.attributes {
            *value = if sensitive_key(key) {
                "[redacted]".into()
            } else {
                text(value)
            };
        }
    }
    for edge in &mut graph.edges {
        edge.from = text(&edge.from);
        edge.to = text(&edge.to);
    }
    for warning in &mut graph.warnings {
        warning.message = text(&warning.message);
    }
    graph
}
