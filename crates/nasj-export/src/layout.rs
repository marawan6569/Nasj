//! Deterministic virtual-host lanes and barycentric row ordering. Shared upstream
//! infrastructure stays in its own lane; model nodes are never duplicated.
use nasj_core::{EdgeKind, NodeKind, Topology};
use std::collections::{BTreeMap, VecDeque};

pub(crate) const CARD_W: usize = 260;
pub(crate) const CARD_H: usize = 88;
pub(crate) const STEP_X: usize = 380;
pub(crate) const STEP_Y: usize = 136;

pub(crate) struct Group {
    pub server: Option<usize>,
    pub label: String,
    pub x: usize,
    pub y: usize,
    pub width: usize,
    pub height: usize,
}
pub(crate) struct Layout {
    pub points: Vec<(usize, usize)>,
    pub groups: Vec<Group>,
    pub width: usize,
    pub bottom: usize,
}

pub(crate) fn compute(graph: &Topology) -> Layout {
    let count = graph.nodes.len();
    let ids: BTreeMap<_, _> = graph
        .nodes
        .iter()
        .enumerate()
        .map(|(i, n)| (n.id.as_str(), i))
        .collect();
    let links: Vec<_> = graph
        .edges
        .iter()
        .filter_map(|edge| {
            Some((
                *ids.get(edge.from.as_str())?,
                *ids.get(edge.to.as_str())?,
                &edge.kind,
            ))
        })
        .collect();
    let mut outgoing = vec![Vec::new(); count];
    for &(from, to, kind) in &links {
        outgoing[from].push((to, kind));
    }
    let servers: Vec<_> = graph
        .nodes
        .iter()
        .enumerate()
        .filter(|(_, n)| n.kind == NodeKind::Server)
        .map(|(i, _)| i)
        .collect();
    let mut owner = vec![servers.len(); count];
    let mut queue = VecDeque::new();
    for (group, &server) in servers.iter().enumerate() {
        owner[server] = group;
        queue.push_back(server);
    }
    while let Some(from) = queue.pop_front() {
        for &(to, kind) in &outgoing[from] {
            let owned = matches!(
                kind,
                EdgeKind::Contains
                    | EdgeKind::ListensOn
                    | EdgeKind::Evaluates
                    | EdgeKind::WhenTrue
                    | EdgeKind::WhenFalse
                    | EdgeKind::RespondsWith
                    | EdgeKind::RedirectsTo
            ) || *kind == EdgeKind::BackedBy
                && graph.nodes[to].kind == NodeKind::StaticRoot
                || *kind == EdgeKind::ProxiesTo && graph.nodes[to].kind == NodeKind::Target;
            if owned && owner[to] == servers.len() && graph.nodes[to].kind != NodeKind::Server {
                owner[to] = owner[from];
                queue.push_back(to);
            }
        }
    }
    for &(from, to, kind) in &links {
        if *kind == EdgeKind::RoutesTo
            && graph.nodes[from].kind == NodeKind::Domain
            && graph.nodes[to].kind == NodeKind::Server
        {
            owner[from] = owner[to];
        }
    }
    let mut incoming = vec![Vec::new(); count];
    let mut degree = vec![0usize; count];
    for &(from, to, _) in &links {
        if owner[from] == owner[to] {
            degree[to] += 1;
            incoming[to].push(from);
        }
    }
    let mut ranks = vec![0usize; count];
    let mut queue: VecDeque<_> = degree
        .iter()
        .enumerate()
        .filter(|(_, d)| **d == 0)
        .map(|(i, _)| i)
        .collect();
    while let Some(from) = queue.pop_front() {
        for &(to, _) in &outgoing[from] {
            if owner[from] != owner[to] {
                continue;
            }
            ranks[to] = ranks[to].max(ranks[from] + 1);
            degree[to] -= 1;
            if degree[to] == 0 {
                queue.push_back(to);
            }
        }
    }
    let mut columns: BTreeMap<(usize, usize), Vec<usize>> = BTreeMap::new();
    for i in 0..count {
        columns.entry((owner[i], ranks[i])).or_default().push(i);
    }
    let mut rows = vec![0usize; count];
    for column in columns.values() {
        for (row, &i) in column.iter().enumerate() {
            rows[i] = row;
        }
    }
    // Forward median/mean sweeps keep related routes/targets close, independent
    // of declarations that happened to appear first in the source file.
    for _ in 0..3 {
        for column in columns.values_mut() {
            column.sort_by(|&a, &b| {
                let center = |i: usize| {
                    let parents = &incoming[i];
                    if parents.is_empty() {
                        rows[i] as f64
                    } else {
                        parents.iter().map(|&p| rows[p] as f64).sum::<f64>() / parents.len() as f64
                    }
                };
                center(a).total_cmp(&center(b)).then(a.cmp(&b))
            });
            for (row, &i) in column.iter().enumerate() {
                rows[i] = row;
            }
        }
    }
    let mut points = vec![(0, 0); count];
    let mut groups = Vec::new();
    let mut offset = 96;
    let mut own_width = 720usize;
    for group in 0..=servers.len() {
        let members: Vec<_> = columns.range((group, 0)..=(group, usize::MAX)).collect();
        if members.is_empty() {
            continue;
        }
        let width = members
            .iter()
            .map(|((_, rank), _)| rank * STEP_X + CARD_W + 72)
            .max()
            .unwrap_or(720)
            .max(720);
        let height = members
            .iter()
            .map(|(_, col)| col.len() * STEP_Y + 56)
            .max()
            .unwrap_or(192);
        let shared = group == servers.len() && !servers.is_empty();
        let x = if shared { own_width + 100 } else { 24 };
        let y = if shared { 96 } else { offset };
        for ((_, rank), column) in &members {
            for (row, &i) in column.iter().enumerate() {
                points[i] = (x + 24 + rank * STEP_X, y + 60 + row * STEP_Y);
            }
        }
        let server = servers.get(group).copied();
        let label = server
            .map(|i| graph.nodes[i].label.clone())
            .unwrap_or_else(|| {
                if shared {
                    "Shared upstream infrastructure".into()
                } else {
                    "Infrastructure".into()
                }
            });
        groups.push(Group {
            server,
            label,
            x,
            y,
            width,
            height,
        });
        if !shared {
            offset += height + 32;
            own_width = own_width.max(width + 24);
        }
    }
    let width = groups
        .iter()
        .map(|g| g.x + g.width + 24)
        .max()
        .unwrap_or(720)
        .max(720);
    let bottom = groups
        .iter()
        .map(|g| g.y + g.height + 24)
        .max()
        .unwrap_or(240);
    Layout {
        points,
        groups,
        width,
        bottom,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn barycentric_order_removes_a_crossing_from_source_order() {
        let source = r#"{"schema_version":"0.2","nodes":[{"id":"a","kind":"domain","label":"a","source":null},{"id":"b","kind":"domain","label":"b","source":null},{"id":"d","kind":"target","label":"d","source":null},{"id":"c","kind":"target","label":"c","source":null}],"edges":[{"from":"a","to":"c","kind":"routes_to","source":null},{"from":"b","to":"d","kind":"routes_to","source":null}],"warnings":[]}"#;
        let graph: Topology = serde_json::from_str(source).unwrap();
        let layout = compute(&graph);
        assert!(layout.points[0].1 < layout.points[1].1);
        assert!(layout.points[3].1 < layout.points[2].1);
    }

    #[test]
    fn realistic_vhosts_have_distinct_lanes_and_nonoverlapping_cards() {
        let config = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../fixtures/nginx/multi-vhost.conf");
        let graph =
            nasj_core::analyze_file(&config, &nasj_core::AnalysisOptions::default()).unwrap();
        let layout = compute(&graph);
        assert_eq!(
            layout.groups.iter().filter(|g| g.server.is_some()).count(),
            4
        );
        assert_eq!(layout.points, compute(&graph).points);
        for (i, &(x, y)) in layout.points.iter().enumerate() {
            assert_eq!(
                layout
                    .groups
                    .iter()
                    .filter(|g| x >= g.x
                        && y >= g.y
                        && x + CARD_W <= g.x + g.width
                        && y + CARD_H <= g.y + g.height)
                    .count(),
                1,
                "node {i}"
            );
            for &(other_x, other_y) in &layout.points[i + 1..] {
                assert!(
                    x + CARD_W <= other_x
                        || other_x + CARD_W <= x
                        || y + CARD_H <= other_y
                        || other_y + CARD_H <= y
                );
            }
        }
        let paired: Vec<_> = graph
            .nodes
            .iter()
            .filter(|n| {
                n.kind == NodeKind::Server && n.attributes["virtual_host"] == "portal.example.test"
            })
            .collect();
        assert_eq!(paired.len(), 2);
        assert_ne!(paired[0].label, paired[1].label);
        assert!(paired
            .iter()
            .any(|n| n.attributes["listeners"].contains("HTTPS :443")));
    }
}
