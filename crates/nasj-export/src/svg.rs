use crate::{edge_label, evidence_label};
use nasj_core::{AnalysisKind, NodeKind, Topology};
use std::collections::{BTreeMap, VecDeque};

const CARD_W: usize = 260;
const CARD_H: usize = 88;

pub(crate) fn escape(value: &str) -> String {
    let mut output = String::new();
    for ch in value.chars() {
        match ch {
            '&' => output.push_str("&amp;"),
            '<' => output.push_str("&lt;"),
            '>' => output.push_str("&gt;"),
            '"' => output.push_str("&quot;"),
            '\'' => output.push_str("&apos;"),
            ch if ch == '\u{fffe}'
                || ch == '\u{ffff}'
                || ch.is_control() && !matches!(ch, '\n' | '\r' | '\t') =>
            {
                output.push('\u{fffd}')
            }
            ch => output.push(ch),
        }
    }
    output
}

fn short(value: &str, limit: usize) -> String {
    let mut text: String = value
        .chars()
        .map(|ch| if ch.is_control() { ' ' } else { ch })
        .take(limit)
        .collect();
    if value.chars().count() > limit {
        text.push('…');
    }
    escape(&text)
}

fn kind(kind: &NodeKind) -> (&'static str, &'static str) {
    use NodeKind::*;
    match kind {
        Domain => ("domain", "#008278"),
        Listener => ("listener", "#376bd6"),
        Server => ("server", "#7655c4"),
        Location => ("location", "#376bd6"),
        Upstream => ("upstream", "#008278"),
        Target => ("target", "#a06413"),
        StaticRoot => ("static root", "#a06413"),
        Redirect => ("redirect / response", "#a06413"),
        Container => ("container", "#7655c4"),
        Service => ("service", "#7655c4"),
        Process => ("process", "#7655c4"),
    }
}

/// Longest-path layering for DAGs, deterministic row order, and a finite fallback
/// for cyclic external graphs. No Graphviz executable or network dependencies.
pub(crate) fn render(graph: &Topology) -> String {
    let index: BTreeMap<_, _> = graph
        .nodes
        .iter()
        .enumerate()
        .map(|(i, n)| (n.id.as_str(), i))
        .collect();
    let mut outgoing = vec![Vec::new(); graph.nodes.len()];
    let mut indegree = vec![0usize; graph.nodes.len()];
    for edge in &graph.edges {
        if let (Some(&from), Some(&to)) =
            (index.get(edge.from.as_str()), index.get(edge.to.as_str()))
        {
            outgoing[from].push(to);
            indegree[to] += 1;
        }
    }
    let mut queue: VecDeque<_> = indegree
        .iter()
        .enumerate()
        .filter(|(_, n)| **n == 0)
        .map(|(i, _)| i)
        .collect();
    let mut ranks = vec![0; graph.nodes.len()];
    while let Some(from) = queue.pop_front() {
        for &to in &outgoing[from] {
            ranks[to] = ranks[to].max(ranks[from] + 1);
            indegree[to] -= 1;
            if indegree[to] == 0 {
                queue.push_back(to);
            }
        }
    }
    let mut rows = BTreeMap::new();
    let points: Vec<_> = ranks
        .iter()
        .map(|rank| {
            let row = rows.entry(*rank).or_insert(0usize);
            let point = (48 + rank * (CARD_W + 150), 110 + *row * (CARD_H + 48));
            *row += 1;
            point
        })
        .collect();
    let width = points
        .iter()
        .map(|(x, _)| x + CARD_W + 48)
        .max()
        .unwrap_or(720)
        .max(720);
    let graph_bottom = points
        .iter()
        .map(|(_, y)| y + CARD_H + 48)
        .max()
        .unwrap_or(240);
    let height =
        graph_bottom + graph.warnings.len() * 24 + if graph.warnings.is_empty() { 0 } else { 40 };
    let analysis = if graph.analysis == AnalysisKind::Synthetic {
        "Synthetic demo"
    } else {
        "Configured topology · runtime unverified"
    };
    let mut output = format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" id="topology-graph" viewBox="0 0 {width} {height}" role="img" aria-labelledby="graph-title graph-description">
<title id="graph-title">NASJ topology</title><desc id="graph-description">{}; {} nodes, {} relationships, {} warnings. Source locations and uncertainty are included.</desc>
<style>.node-card{{fill:var(--card,#fff)}}.node-label{{font:600 14px system-ui,sans-serif;fill:var(--ink,#192b40)}}.node-kind,.node-source,.edge-label,.graph-note{{font:12px system-ui,sans-serif;fill:var(--muted,#53657a)}}.node-source{{font-size:11px}}.edge-path{{fill:none;stroke:var(--edge,#7e91a5);stroke-width:1.5}}.edge-label{{font-size:10px;paint-order:stroke;stroke:var(--canvas,#f5f8fc);stroke-width:4px;stroke-linejoin:round}}.graph-heading{{font:700 21px system-ui,sans-serif;fill:var(--ink,#192b40)}}</style>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#7e91a5"/></marker></defs>
<rect width="100%" height="100%" fill="var(--canvas,#f5f8fc)"/>
<text x="48" y="40" class="graph-heading">NASJ · نسج</text><text x="48" y="65" class="graph-note">{analysis} · {} nodes · {} relationships · {} warnings</text>
"##,
        escape(analysis),
        graph.nodes.len(),
        graph.edges.len(),
        graph.warnings.len(),
        graph.nodes.len(),
        graph.edges.len(),
        graph.warnings.len()
    );
    for (i, edge) in graph.edges.iter().enumerate() {
        let (Some(&from), Some(&to)) = (index.get(edge.from.as_str()), index.get(edge.to.as_str()))
        else {
            continue;
        };
        let ((x1, y1), (x2, y2)) = (points[from], points[to]);
        let x1 = x1 + CARD_W;
        let y1 = y1 + CARD_H / 2;
        let y2 = y2 + CARD_H / 2;
        let middle = (x1 + x2) / 2;
        output.push_str(&format!(r#"<g class="edge" data-edge="{i}"><title>{} ({})</title><path class="edge-path" d="M{x1} {y1} C{middle} {y1} {middle} {y2} {x2} {y2}" marker-end="url(#arrow)"/><text class="edge-label" x="{middle}" y="{}" text-anchor="middle">{}</text></g>
"#, edge_label(&edge.kind), evidence_label(&edge.evidence), (y1+y2)/2-8, edge_label(&edge.kind)));
    }
    for (i, node) in graph.nodes.iter().enumerate() {
        let (x, y) = points[i];
        let (kind, color) = kind(&node.kind);
        let source = node
            .source
            .as_ref()
            .map(|s| {
                format!(
                    "{}:{}",
                    s.path.rsplit('/').next().unwrap_or(&s.path),
                    s.line
                )
            })
            .unwrap_or_else(|| "synthetic / no source".into());
        let full_source = node
            .source
            .as_ref()
            .map(|s| format!("{}:{}", s.path, s.line))
            .unwrap_or_default();
        let unresolved = node
            .attributes
            .get("routing")
            .is_some_and(|value| value == "unresolved");
        output.push_str(&format!(r#"<g class="node" data-node="{i}" transform="translate({x} {y})" tabindex="0" role="group" aria-label="{}"><title>{} · {}</title><rect class="node-card" width="{CARD_W}" height="{CARD_H}" rx="10" stroke="{color}" stroke-width="1.5"/><text x="16" y="23" class="node-kind">{kind}{}</text><text x="16" y="48" class="node-label">{}</text><text x="16" y="71" class="node-source">{}</text></g>
"#, escape(&node.label),escape(&node.label),escape(&full_source), if unresolved { " · unresolved" } else { "" },short(&node.label,29),short(&source,37)));
    }
    if graph.nodes.is_empty() {
        output.push_str("<text x=\"48\" y=\"140\" class=\"graph-note\">No configured nodes. Review the analysis warnings.</text>\n");
    }
    for (i, warning) in graph.warnings.iter().enumerate() {
        output.push_str(&format!(
            "<text x=\"48\" y=\"{}\" class=\"graph-note\"><title>{}</title>{}</text>\n",
            graph_bottom + 24 + i * 24,
            escape(&warning.message),
            short(&format!("{}: {}", warning.code, warning.message), 110)
        ));
    }
    output.push_str("</svg>\n");
    output
}
