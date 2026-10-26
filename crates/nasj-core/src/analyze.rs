//! Conservative HTTP configuration semantics. This is not request simulation.
use crate::{
    redact, syntax::Directive, Edge, EdgeKind, Evidence, Node, NodeKind, SourceLocation, Topology,
    Warning,
};
use std::collections::BTreeMap;

struct Analyzer {
    graph: Topology,
    upstreams: BTreeMap<String, String>,
}

impl Analyzer {
    fn node(
        &mut self,
        kind: NodeKind,
        label: &str,
        source: &SourceLocation,
        attrs: &[(&str, String)],
    ) -> String {
        let id = format!("n{:06}", self.graph.nodes.len() + 1);
        self.graph.nodes.push(Node {
            id: id.clone(),
            kind,
            label: redact::text(label),
            source: Some(source.clone()),
            attributes: attrs
                .iter()
                .map(|(key, value)| ((*key).into(), redact::text(value)))
                .collect(),
        });
        id
    }

    fn edge(&mut self, from: &str, to: &str, kind: EdgeKind, source: &SourceLocation) {
        self.graph.edges.push(Edge {
            from: from.into(),
            to: to.into(),
            kind,
            source: Some(source.clone()),
            evidence: Evidence::Configured,
        });
    }

    fn warn(&mut self, code: &str, message: &str, source: &SourceLocation) {
        self.graph.warnings.push(Warning {
            code: code.into(),
            message: message.into(),
            source: Some(source.clone()),
        });
    }

    fn unresolved(&mut self, owner: &str, directive: &Directive, message: &str) {
        if let Some(node) = self.graph.nodes.iter_mut().find(|node| node.id == owner) {
            node.attributes
                .insert("routing".into(), "unresolved".into());
        }
        self.warn("routing.unresolved", message, &directive.source);
    }

    fn upstream(&mut self, directive: &Directive) {
        let (Some(name), Some(children)) = (directive.args.first(), directive.children.as_ref())
        else {
            self.warn(
                "upstream.arguments",
                "upstream requires a name and block",
                &directive.source,
            );
            return;
        };
        let name_key = name.to_ascii_lowercase();
        if directive.args.len() != 1 || name.contains('$') || self.upstreams.contains_key(&name_key)
        {
            self.warn(
                "upstream.ambiguous",
                "duplicate or dynamic upstream name; routes to it are unresolved",
                &directive.source,
            );
            self.upstreams.insert(name_key, String::new());
            return;
        }
        let id = self.node(NodeKind::Upstream, name, &directive.source, &[]);
        self.upstreams.insert(name_key, id.clone());
        let mut members = 0;
        for child in children {
            if child.name != "server" {
                continue;
            }
            let Some(target) = child.args.first().filter(|arg| !arg.contains('$')) else {
                self.unresolved(&id, child, "dynamic or missing upstream member");
                continue;
            };
            if child.children.is_some() || !valid_endpoint(target) {
                self.unresolved(&id, child, "unsupported upstream member address");
                continue;
            }
            let member = self.node(
                NodeKind::Target,
                target,
                &child.source,
                &[
                    ("parameters", safe_parameters(&child.args[1..])),
                    ("state", "configured".into()),
                ],
            );
            self.edge(&id, &member, EdgeKind::BackedBy, &child.source);
            members += 1;
        }
        if members == 0 {
            self.warn(
                "upstream.empty",
                "upstream has no statically resolved members",
                &directive.source,
            );
        }
    }

    fn server(&mut self, directive: &Directive, inherited: &[Directive]) {
        let Some(children) = directive.children.as_ref() else {
            self.warn("server.block", "server requires a block", &directive.source);
            return;
        };
        let server = self.node(
            NodeKind::Server,
            "server",
            &directive.source,
            &[("state", "configured".into())],
        );
        let mut listens = 0;
        for child in children {
            match child.name.as_str() {
                "listen" => {
                    let Some(address) = child.args.first() else {
                        self.warn(
                            "listen.arguments",
                            "listen requires an address or port",
                            &child.source,
                        );
                        continue;
                    };
                    if address.contains('$') {
                        self.unresolved(&server, child, "dynamic listen address");
                        continue;
                    }
                    let Some((host, port)) = listener(address) else {
                        self.warn(
                            "listen.unsupported",
                            "unsupported listener address",
                            &child.source,
                        );
                        continue;
                    };
                    let tls = child.args.iter().any(|a| a == "ssl");
                    let id = self.node(
                        NodeKind::Listener,
                        address,
                        &child.source,
                        &[
                            ("address", host),
                            ("port", port),
                            ("protocol", if tls { "https" } else { "http" }.into()),
                            ("parameters", safe_parameters(&child.args[1..])),
                        ],
                    );
                    self.edge(&server, &id, EdgeKind::ListensOn, &child.source);
                    listens += 1;
                }
                "server_name" => {
                    for name in &child.args {
                        if name.contains('$') {
                            self.unresolved(
                                &server,
                                child,
                                "dynamic server name cannot be resolved statically",
                            );
                            continue;
                        }
                        let id = self.node(
                            NodeKind::Domain,
                            name,
                            &child.source,
                            &[(
                                "match",
                                if name.starts_with('~') {
                                    "regex"
                                } else if name.contains('*') || name.starts_with('.') {
                                    "wildcard"
                                } else {
                                    "exact"
                                }
                                .into(),
                            )],
                        );
                        self.edge(&id, &server, EdgeKind::RoutesTo, &child.source);
                    }
                }
                _ => {}
            }
        }
        if listens == 0 {
            self.warn(
                "listen.implicit",
                "no explicit supported listener; Nginx defaults depend on platform and privileges",
                &directive.source,
            );
        }
        let inherited: Vec<_> = inherited
            .iter()
            .filter(|d| d.name == "root")
            .cloned()
            .collect();
        self.scope(&server, children, &inherited, false);
    }

    fn scope(
        &mut self,
        owner: &str,
        children: &[Directive],
        inherited: &[Directive],
        ancestor_uncertain: bool,
    ) {
        // Internal redirects/rewrites and extension handlers prevent a claim
        // about an effective destination. Keep containment, drop routing edges.
        let uncertain = ancestor_uncertain
            || children.iter().any(|d| {
                matches!(
                    d.name.as_str(),
                    "if" | "rewrite" | "try_files" | "error_page" | "mirror" | "limit_except"
                ) || d.name.ends_with("_by_lua_file")
                    || d.name.starts_with("js_")
            });
        if uncertain {
            if let Some(directive) = children.first() {
                self.unresolved(owner, directive, "conditional, rewrite, or unsupported handler context; effective routes are unresolved");
            }
        }
        // Only root and proxy_pass inheritance is modeled. return and alias
        // have context-specific rules; don't propagate them across locations.
        let mut effective = Vec::new();
        for name in ["root", "alias", "proxy_pass"] {
            let local: Vec<_> = children.iter().filter(|d| d.name == name).collect();
            if local.len() > 1 {
                self.warn(
                    "directive.duplicate",
                    "duplicate routing directive; destination unresolved",
                    &local[1].source,
                );
                continue;
            }
            if let Some(d) = local.first() {
                effective.push((*d).clone());
            } else if name != "alias" {
                if name == "root" && children.iter().any(|d| d.name == "alias") {
                    continue;
                }
                if let Some(d) = inherited.iter().find(|d| d.name == name) {
                    effective.push(d.clone());
                }
            }
        }
        let returns: Vec<_> = children.iter().filter(|d| d.name == "return").collect();
        let has_return = !returns.is_empty();
        if returns.len() > 1 {
            self.unresolved(
                owner,
                returns[1],
                "multiple return directives are not simulated",
            );
        }
        if !uncertain && returns.len() <= 1 {
            if let Some(d) = returns.first() {
                self.redirect(owner, d);
            } else {
                for d in &effective {
                    match d.name.as_str() {
                        "proxy_pass" => self.proxy(owner, d),
                        "root" | "alias" => self.static_path(owner, d),
                        _ => {}
                    }
                }
            }
        }
        for child in children {
            if child.name != "location" {
                if child.children.is_some() && !matches!(child.name.as_str(), "if" | "limit_except")
                {
                    self.warn(
                        "context.unsupported",
                        "nested context is not analyzed",
                        &child.source,
                    );
                }
                if matches!(
                    child.name.as_str(),
                    "fastcgi_pass" | "uwsgi_pass" | "scgi_pass" | "grpc_pass"
                ) {
                    self.unresolved(owner, child, "non-HTTP proxy handler is unsupported");
                }
                continue;
            }
            let Some(body) = child.children.as_ref() else {
                self.warn("location.block", "location requires a block", &child.source);
                continue;
            };
            let (matching, pattern) = match child.args.as_slice() {
                [pattern] => (
                    if pattern.starts_with('@') {
                        "named"
                    } else {
                        "prefix"
                    },
                    pattern.as_str(),
                ),
                [modifier, pattern] if matches!(modifier.as_str(), "=" | "^~" | "~" | "~*") => (
                    match modifier.as_str() {
                        "=" => "exact",
                        "~" => "regex",
                        "~*" => "regex_case_insensitive",
                        _ => "prefix_preferred",
                    },
                    pattern.as_str(),
                ),
                _ => {
                    self.warn(
                        "location.arguments",
                        "unsupported location pattern",
                        &child.source,
                    );
                    continue;
                }
            };
            let id = self.node(
                NodeKind::Location,
                &format!("location {}", child.args.join(" ")),
                &child.source,
                &[("match", matching.into()), ("pattern", pattern.into())],
            );
            self.edge(owner, &id, EdgeKind::Contains, &child.source);
            self.scope(&id, body, &effective, uncertain || has_return);
        }
    }

    fn proxy(&mut self, owner: &str, d: &Directive) {
        let [url] = d.args.as_slice() else {
            self.unresolved(owner, d, "proxy_pass requires one URL");
            return;
        };
        if d.children.is_some() || url.contains('$') {
            self.unresolved(
                owner,
                d,
                "variable proxy_pass cannot be resolved statically",
            );
            return;
        }
        let Some(rest) = url
            .strip_prefix("http://")
            .or_else(|| url.strip_prefix("https://"))
        else {
            self.unresolved(owner, d, "unsupported proxy URL scheme");
            return;
        };
        // Unix sockets can contain a URI after :/; keep the socket destination.
        let authority = if rest.starts_with("unix:") {
            rest.split(":/").next().unwrap_or(rest)
        } else {
            rest.split(['/', '?', '#']).next().unwrap_or("")
        };
        if authority.is_empty() || authority.contains('@') || !valid_endpoint(authority) {
            self.unresolved(owner, d, "invalid or credential-bearing proxy destination");
            return;
        }
        let key = authority.to_ascii_lowercase();
        let target = self
            .upstreams
            .iter()
            .find(|(name, _)| name.to_ascii_lowercase() == key)
            .map(|(_, id)| id.clone());
        let target = match target {
            Some(id) if id.is_empty() => {
                self.unresolved(owner, d, "ambiguous upstream name");
                return;
            }
            Some(id) => id,
            None => self.node(
                NodeKind::Target,
                authority,
                &d.source,
                &[("url", redact::text(url)), ("state", "configured".into())],
            ),
        };
        self.edge(owner, &target, EdgeKind::ProxiesTo, &d.source);
    }

    fn static_path(&mut self, owner: &str, d: &Directive) {
        let [path] = d.args.as_slice() else {
            self.unresolved(owner, d, "static path requires one argument");
            return;
        };
        if path.contains('$') {
            self.unresolved(
                owner,
                d,
                "variable document path cannot be resolved statically",
            );
            return;
        }
        let id = self.node(
            NodeKind::StaticRoot,
            path,
            &d.source,
            &[("directive", d.name.clone())],
        );
        self.edge(owner, &id, EdgeKind::BackedBy, &d.source);
    }

    fn redirect(&mut self, owner: &str, d: &Directive) {
        let (status, destination) = match d.args.as_slice() {
            [url] if url.starts_with("http://") || url.starts_with("https://") => {
                ("302", url.as_str())
            }
            [code, url] if matches!(code.as_str(), "301" | "302" | "303" | "307" | "308") => {
                (code.as_str(), url.as_str())
            }
            [code] | [code, _] if code.parse::<u16>().is_ok_and(|n| (100..=599).contains(&n)) => {
                let id = self.node(
                    NodeKind::Redirect,
                    &format!("return {code}"),
                    &d.source,
                    &[
                        ("status", code.clone()),
                        ("response", "body omitted".into()),
                    ],
                );
                self.edge(owner, &id, EdgeKind::Contains, &d.source);
                return;
            }
            _ => {
                self.unresolved(owner, d, "unsupported return arguments");
                return;
            }
        };
        if destination.contains('$') {
            self.unresolved(owner, d, "dynamic redirect destination");
            return;
        }
        let id = self.node(
            NodeKind::Redirect,
            destination,
            &d.source,
            &[("status", status.into())],
        );
        self.edge(owner, &id, EdgeKind::RedirectsTo, &d.source);
    }
}

fn safe_parameters(values: &[String]) -> String {
    values
        .iter()
        .filter(|value| {
            if matches!(
                value.as_str(),
                "backup"
                    | "down"
                    | "resolve"
                    | "ssl"
                    | "default_server"
                    | "http2"
                    | "proxy_protocol"
                    | "reuseport"
                    | "so_keepalive=on"
                    | "so_keepalive=off"
                    | "ipv6only=on"
                    | "ipv6only=off"
            ) {
                return true;
            }
            value.split_once('=').is_some_and(|(key, value)| {
                matches!(
                    key,
                    "weight"
                        | "max_conns"
                        | "max_fails"
                        | "fail_timeout"
                        | "backlog"
                        | "rcvbuf"
                        | "sndbuf"
                ) && value.starts_with(|ch: char| ch.is_ascii_digit())
                    && value
                        .bytes()
                        .all(|b| b.is_ascii_digit() || b".smhdk".contains(&b))
            })
        })
        .cloned()
        .collect::<Vec<_>>()
        .join(" ")
}

fn hostname(value: &str) -> bool {
    !value.is_empty()
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"-._".contains(&b))
}

fn valid_endpoint(value: &str) -> bool {
    if value.starts_with("unix:") {
        return value.len() > 5;
    }
    if value.is_empty()
        || value.contains(|ch: char| {
            ch.is_whitespace() || matches!(ch, '/' | '@' | '?' | '#' | '$' | '\\')
        })
    {
        return false;
    }
    if value.starts_with('[') {
        return listener(value).is_some();
    }
    let (host, port) = value
        .split_once(':')
        .map_or((value, None), |(h, p)| (h, Some(p)));
    hostname(host) && port.is_none_or(|p| p.parse::<u16>().is_ok_and(|port| port != 0))
}

fn listener(value: &str) -> Option<(String, String)> {
    if let Some(socket) = value.strip_prefix("unix:") {
        return Some((format!("unix:{socket}"), String::new()));
    }
    if let Ok(port) = value.parse::<u16>() {
        return (port != 0).then(|| ("*".into(), port.to_string()));
    }
    let (host, port) = if value.starts_with('[') {
        let end = value.find(']')?;
        value[1..end].parse::<std::net::Ipv6Addr>().ok()?;
        (
            &value[..=end],
            if value.len() == end + 1 {
                "80"
            } else {
                value[end + 1..].strip_prefix(':')?
            },
        )
    } else {
        let (host, port) = value.split_once(':').unwrap_or((value, "80"));
        if host != "*" && !hostname(host) {
            return None;
        }
        (host, port)
    };
    if host.is_empty()
        || host.contains(|ch: char| ch.is_whitespace() || matches!(ch, '/' | '$' | '@'))
    {
        return None;
    }
    let port = port.parse::<u16>().ok()?;
    (port != 0).then(|| (host.into(), port.to_string()))
}

pub(crate) fn analyze(tree: &[Directive]) -> Topology {
    let mut analyzer = Analyzer {
        graph: Topology::default(),
        upstreams: BTreeMap::new(),
    };
    let mut found = false;
    for http in tree {
        if http.name != "http" {
            if matches!(http.name.as_str(), "stream" | "mail") {
                analyzer.warn(
                    "context.unsupported",
                    "only HTTP topology is analyzed",
                    &http.source,
                );
            }
            continue;
        }
        found = true;
        let Some(children) = &http.children else {
            analyzer.warn("http.block", "http requires a block", &http.source);
            continue;
        };
        for d in children.iter().filter(|d| d.name == "upstream") {
            analyzer.upstream(d);
        }
        for d in children.iter().filter(|d| d.name == "server") {
            analyzer.server(d, children);
        }
    }
    if !found {
        analyzer.graph.warnings.push(Warning {
            code: "analysis.no_http".into(),
            message: "no http block found; select a complete nginx.conf".into(),
            source: None,
        });
    }
    analyzer.graph
}
