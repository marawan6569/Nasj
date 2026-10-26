//! Conservative HTTP configuration semantics. This is not request simulation.
use crate::{
    control::{self, Action, Step},
    redact,
    syntax::Directive,
    AnalysisKind, Comparison, Edge, EdgeKind, Evidence, Node, NodeKind, SourceLocation, Topology,
    Warning,
};
use std::collections::BTreeMap;

struct Analyzer {
    graph: Topology,
    upstreams: BTreeMap<String, String>,
    node_index: BTreeMap<String, usize>,
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
        self.node_index.insert(id.clone(), self.graph.nodes.len());
        self.graph.nodes.push(Node {
            id: id.clone(),
            kind,
            label: redact::text(label),
            source: Some(source.clone()),
            attributes: attrs
                .iter()
                .map(|(key, value)| ((*key).into(), redact::text(value)))
                .collect(),
            condition: None,
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

    fn mark_unresolved(&mut self, owner: &str) {
        if let Some(node) = self
            .node_index
            .get(owner)
            .and_then(|&index| self.graph.nodes.get_mut(index))
        {
            node.attributes
                .insert("routing".into(), "unresolved".into());
        }
    }

    fn unresolved(&mut self, owner: &str, directive: &Directive, message: &str) {
        self.mark_unresolved(owner);
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
            .filter(|d| matches!(d.name.as_str(), "root" | "error_page"))
            .cloned()
            .collect();
        self.scope(&server, children, &inherited, false, true);
    }

    fn scope(
        &mut self,
        owner: &str,
        children: &[Directive],
        inherited: &[Directive],
        ancestor_uncertain: bool,
        server_level: bool,
    ) {
        let inherited_error = inherited.iter().any(|d| d.name == "error_page");
        let program = if server_level && !inherited_error {
            control::program(children)
        } else {
            None
        };
        let supported_if = server_level && program.is_some();
        // Internal redirects/rewrites and extension handlers prevent a claim
        // about an effective destination. Keep containment, drop routing edges.
        let mut uncertain = ancestor_uncertain
            || inherited_error
            || children.iter().any(|d| {
                matches!(
                    d.name.as_str(),
                    "rewrite"
                        | "set"
                        | "break"
                        | "try_files"
                        | "error_page"
                        | "mirror"
                        | "limit_except"
                ) || d.name == "if" && !supported_if
                    || d.name.ends_with("_by_lua_file")
                    || d.name.starts_with("js_")
            });
        if uncertain {
            self.mark_unresolved(owner);
            if let Some(source) = self
                .node_index
                .get(owner)
                .and_then(|&index| self.graph.nodes.get(index))
                .and_then(|node| node.source.clone())
            {
                self.warn("routing.unresolved", "this rewrite/conditional context is unsupported by static analysis; effective routes are unresolved (not a Nginx validity error)", &source);
            }
        }
        let inherited_alias = inherited.iter().find(|d| d.name == "alias");
        let local_path = children
            .iter()
            .any(|d| matches!(d.name.as_str(), "root" | "alias"));
        if !local_path {
            if let Some(alias) = inherited_alias {
                uncertain = true;
                self.mark_unresolved(owner);
                self.warn("alias.inheritance", "alias inheritance into nested locations is unsupported; effective routes are unresolved", &alias.source);
            }
        }
        if children.iter().any(|d| d.name == "root") {
            if let Some(alias) = children.iter().find(|d| d.name == "alias") {
                uncertain = true;
                self.mark_unresolved(owner);
                self.warn(
                    "directive.conflict",
                    "root and alias conflict in one context; effective routes are unresolved",
                    &alias.source,
                );
            }
        }
        // Root is inherited; ordinary nested location pass handlers are not.
        // Carry aliases only to diagnose unsupported inheritance.
        let mut effective = Vec::new();
        for name in ["root", "alias", "proxy_pass"] {
            let local: Vec<_> = children.iter().filter(|d| d.name == name).collect();
            if local.len() > 1 {
                uncertain = true;
                self.mark_unresolved(owner);
                self.warn(
                    "directive.duplicate",
                    "duplicate routing directive; destination unresolved",
                    &local[1].source,
                );
                continue;
            }
            if let Some(d) = local.first() {
                effective.push((*d).clone());
            } else if name == "root" {
                if children.iter().any(|d| d.name == "alias") {
                    continue;
                }
                if let Some(d) = inherited.iter().find(|d| d.name == name) {
                    effective.push(d.clone());
                }
            } else if name == "alias" && !local_path {
                if let Some(alias) = inherited_alias {
                    effective.push(alias.clone());
                }
            }
        }
        let error_pages: Vec<_> = children
            .iter()
            .filter(|d| d.name == "error_page")
            .cloned()
            .collect();
        effective.extend(if error_pages.is_empty() {
            inherited
                .iter()
                .filter(|d| d.name == "error_page")
                .cloned()
                .collect()
        } else {
            error_pages
        });
        // root is configuration metadata even when a content handler replaces
        // static serving. Ordinary named/prefix locations do not inherit pass
        // handlers; Nginx's special noname/limit_except contexts are excluded.
        if let Some(root) = effective.iter().find(|d| d.name == "root") {
            if let Some(node) = self
                .node_index
                .get(owner)
                .and_then(|&i| self.graph.nodes.get_mut(i))
            {
                node.attributes.insert(
                    "configured_root".into(),
                    redact::text(&root.args.first().cloned().unwrap_or_default()),
                );
                node.attributes.insert(
                    "root_origin".into(),
                    if children.iter().any(|d| d.name == "root") {
                        "local"
                    } else {
                        "inherited"
                    }
                    .into(),
                );
                node.attributes.insert(
                    "root_source".into(),
                    format!("{}:{}", root.source.path, root.source.line),
                );
            }
        }
        let handlers: Vec<_> = children
            .iter()
            .filter(|d| {
                matches!(
                    d.name.as_str(),
                    "proxy_pass" | "fastcgi_pass" | "uwsgi_pass" | "scgi_pass" | "grpc_pass"
                )
            })
            .collect();
        let unsupported = handlers.iter().find(|d| d.name != "proxy_pass");
        if let Some(d) = unsupported {
            self.unresolved(owner,d,"this upstream content handler is unsupported by static analysis; no effective destination is asserted (not a Nginx validity error)");
        }
        if handlers.len() > 1 {
            uncertain = true;
            self.unresolved(
                owner,
                handlers[1],
                "multiple content handlers; no effective destination is asserted",
            );
        }
        let returns: Vec<_> = children.iter().filter(|d| d.name == "return").collect();
        let has_control = !returns.is_empty() || children.iter().any(|d| d.name == "if");
        if !uncertain {
            if let Some(steps) = program.filter(|steps| !steps.is_empty()) {
                self.control_flow(owner, steps);
            } else if let Some(d) = returns.first() {
                self.redirect(owner, d);
            } else if unsupported.is_none() {
                if let Some(proxy) = effective.iter().find(|d| d.name == "proxy_pass") {
                    self.proxy(owner, proxy);
                } else {
                    for d in effective
                        .iter()
                        .filter(|d| matches!(d.name.as_str(), "root" | "alias"))
                    {
                        self.static_path(owner, d);
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
            self.scope(&id, body, &effective, uncertain || has_control, false);
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
        let authority = if let Some(socket) = rest.strip_prefix("unix:") {
            format!("unix:{}", socket.split(":/").next().unwrap_or(socket))
        } else {
            rest.split(['/', '?', '#']).next().unwrap_or("").to_owned()
        };
        if authority.is_empty() || authority.contains('@') || !valid_endpoint(&authority) {
            self.unresolved(owner, d, "invalid or credential-bearing proxy destination");
            return;
        }
        let key = authority.to_ascii_lowercase();
        let target = self.upstreams.get(&key).cloned();
        let target = match target {
            Some(id) if id.is_empty() => {
                self.unresolved(owner, d, "ambiguous upstream name");
                return;
            }
            Some(id) => id,
            None => self.node(
                NodeKind::Target,
                &authority,
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
        if path.contains('$') || d.children.is_some() {
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

    fn action_node(&mut self, action: Action, d: &Directive) -> String {
        match action {
            Action::Response { status } => self.node(
                NodeKind::Response,
                &format!("return {status}"),
                &d.source,
                &[("status", status), ("response", "body omitted".into())],
            ),
            Action::Redirect { status, expression } => {
                let dynamic = expression.contains('$');
                let id = self.node(
                    NodeKind::Redirect,
                    &format!("{status} → {expression}"),
                    &d.source,
                    &[
                        ("status", status),
                        ("target_expression", expression),
                        (
                            "destination_resolution",
                            if dynamic { "dynamic" } else { "literal" }.into(),
                        ),
                    ],
                );
                if dynamic {
                    self.mark_unresolved(&id);
                }
                id
            }
        }
    }

    fn redirect(&mut self, owner: &str, d: &Directive) {
        let Some(action) = control::action(d) else {
            self.unresolved(
                owner,
                d,
                "return arguments are unsupported by static analysis (not a Nginx validity error)",
            );
            return;
        };
        let kind = if matches!(action, Action::Redirect { .. }) {
            EdgeKind::RedirectsTo
        } else {
            EdgeKind::RespondsWith
        };
        let id = self.action_node(action, d);
        self.edge(owner, &id, kind, &d.source);
    }

    fn control_flow(&mut self, owner: &str, steps: Vec<Step<'_>>) {
        if steps.iter().any(|step| matches!(step, Step::If { .. })) {
            if let Some(node) = self
                .node_index
                .get(owner)
                .and_then(|&i| self.graph.nodes.get_mut(i))
            {
                node.attributes
                    .entry("routing".into())
                    .or_insert("conditional".into());
            }
        }
        let mut pending = owner.to_owned();
        let mut previous = None;
        for step in steps {
            match step {
                Step::If {
                    directive,
                    condition,
                    action,
                    action_source,
                } => {
                    let operator = if condition.operator == Comparison::Equal {
                        "="
                    } else {
                        "!="
                    };
                    let label = format!("{} {operator} {:?}", condition.variable, condition.value);
                    let id = self.node(
                        NodeKind::Condition,
                        &label,
                        &directive.source,
                        &[("phase", "server_rewrite".into())],
                    );
                    if let Some(node) = self
                        .node_index
                        .get(&id)
                        .and_then(|&i| self.graph.nodes.get_mut(i))
                    {
                        node.condition = Some(condition);
                    }
                    self.edge(
                        &pending,
                        &id,
                        if previous.is_some() {
                            EdgeKind::WhenFalse
                        } else {
                            EdgeKind::Evaluates
                        },
                        previous.unwrap_or(&directive.source),
                    );
                    let target = self.action_node(action, action_source);
                    self.edge(&id, &target, EdgeKind::WhenTrue, &directive.source);
                    pending = id;
                    previous = Some(&directive.source);
                }
                Step::Return { directive, action } => {
                    let kind = if previous.is_some() {
                        EdgeKind::WhenFalse
                    } else if matches!(action, Action::Redirect { .. }) {
                        EdgeKind::RedirectsTo
                    } else {
                        EdgeKind::RespondsWith
                    };
                    let target = self.action_node(action, directive);
                    self.edge(
                        &pending,
                        &target,
                        kind,
                        previous.unwrap_or(&directive.source),
                    );
                    return;
                }
            }
        }
        if let Some(source) = previous {
            let id = self.node(
                NodeKind::RoutingStep,
                "Continue to location matching (not simulated)",
                source,
                &[
                    ("phase", "location_selection".into()),
                    ("routing", "unresolved".into()),
                ],
            );
            self.edge(&pending, &id, EdgeKind::WhenFalse, source);
            self.mark_unresolved(owner);
            self.warn("routing.fallthrough","a false conditional continues to location matching; the final outcome is not simulated (not a Nginx validity error)",source);
        }
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
    if let Some(path) = value.strip_prefix("unix:") {
        return path.starts_with('/') && path.len() > 1 && !path.contains(['$', '?', '#']);
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
        return valid_endpoint(value).then(|| (format!("unix:{socket}"), String::new()));
    }
    if !value.is_empty() && value.bytes().all(|ch| ch.is_ascii_digit()) {
        let port = value.parse::<u16>().ok()?;
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
        graph: Topology {
            analysis: AnalysisKind::Configuration,
            ..Topology::default()
        },
        upstreams: BTreeMap::new(),
        node_index: BTreeMap::new(),
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
