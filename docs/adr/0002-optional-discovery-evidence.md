# ADR-0002: optional discovery with observation-backed correlations

Date: 2026-10-26. Status: proposed for v0.2; documentation only. Related: #5.
Do not implement until v0.1's release validation is sufficiently complete.

## Boundary and alternatives

Keep static analysis deterministic and offline. Future discovery belongs in a
separate optional adapter layer, with no dependency from `nasj-core` to Docker,
systemd, process inspection or network clients. Core retains normalized graph
and evidence types. CLI orchestration explicitly selects discovery adapters or
imports sanitized observation snapshots; ordinary `nasj map` stays static.

Start with snapshot import/correlation, then add independently reviewed live
read-only adapters. Do not create a discovery crate, add dependencies or expose
placeholder commands in v0.1. A monolithic always-on scanner is rejected because
it changes offline/permission contracts and makes static tests machine-dependent.
Matching only by port or process name is rejected as insufficient evidence.

Conceptual future pipeline (not an implemented command/API):

```text
static Topology ──────────────────────────────┐
explicit snapshot/live adapter → observations ├→ correlator → graph + evidence
permission gaps / adapter errors ─────────────┘
```

## Observation contract

Define a separate versioned snapshot schema before implementation. Each record
must retain: adapter/source type, capture time and validity interval, opaque host
identity, network/PID namespace identity if known, collection method, adapter/API
version, permission/completeness status and sanitized evidence fields. Retain a
reference to observation IDs on each correlation. PID identity must include start
time or another anti-reuse identity; unit/container identity must not be only a
display name. Unknown namespace/time is explicit, never assumed to be the host.

The report stores an allowlist, not raw Docker inspect, process command lines,
environments, labels or service secrets. Imported files are untrusted and bounded.
Optional snapshot digests support provenance without embedding sensitive raw data.
The exact timestamp/host identity retention policy is a review decision, since it
can itself disclose infrastructure information.

## Meaning of evidence

| Classification | Meaning in future discovery |
| --- | --- |
| configured | A static declaration with Nginx file/line provenance; unchanged by discovery |
| confirmed | A narrowly stated observed fact backed by matching identities/namespace/time; never an end-to-end request success claim |
| inferred | A plausible correlation with explicit assumptions and observation IDs |
| unresolved | Missing/ambiguous/contradictory evidence, permission gaps, stale time or unknown namespaces |

Examples: an engine observation can confirm a published-port declaration, but
does not establish that the container application accepts requests. A kernel
socket-ownership observation can confirm which process owned a listener at capture
time, but not future reachability. Joining the two without namespace/time/owner
evidence remains inferred or unresolved. Never upgrade a variable proxy target
to a configured destination merely because a matching process exists.

Keep configured and observed edges separate. A correlation may reference several
observations; store its rationale, assumptions and competing candidates. Do not
collapse a numeric confidence score into false precision. Filters/exporters must
display these classifications and permission gaps without hiding static topology.

## Planned adapter sequence

1. **Snapshot reader and pure correlator.** Fixture-only observations, no sockets
   or process access. Explicit endpoint normalization for protocol, address, port,
   family and namespace. No implicit DNS or active TCP probes.
2. **Linux listeners/processes.** Inspect only the selected accessible namespace
   and permitted process metadata. Prefer kernel socket diagnostics; evaluate a
   procfs fallback and document visibility limitations. Do not join by port alone.
   A denied PID/FD read produces incomplete evidence, not an absent service.
3. **Systemd.** Explicit system/user manager selection and read-only unit/property
   queries. Correlate service identity/cgroup/MainPID with process identity and
   capture time. Handle socket activation and inactive/oneshot units separately.
   No start/stop/reload or privilege prompts. Name similarity is not ownership.
4. **Docker.** Explicitly opt into a chosen local engine endpoint or snapshot;
   never automatically use `/var/run/docker.sock` or ambient remote contexts.
   Project only container identity/state, network namespace identity when known,
   network addresses and published TCP mappings. Version-negotiate the future
   read-only API client; no mutation/exec/log/env retrieval. Remote endpoints would
   need separate explicit network authorization and credential handling.

Permission failures are per-adapter diagnostics so static results remain useful.
No sudo fallback, namespace entry, host filesystem mounts or Docker access by
default. Socket access can grant broad authority even when our requests are
read-only; authorization must be explicit each invocation/configuration.

## Correlation rules and failure cases

- `127.0.0.1` in an unknown Nginx namespace is unresolved; it is not automatically
  the host or a container. Host-network containers and rootless engines need
  explicit identity evidence. Bridge addresses alone are not published host ports.
- Normalize IPv4/IPv6 and wildcard endpoints without assuming dual-stack behavior.
  Address family/protocol and wildcard bind applicability must match observations.
  UDP observations do not satisfy HTTP TCP targets. Unix sockets need filesystem
  and namespace evidence rather than a TCP-port match.
- A Docker published host port is distinct from its container port; retain both
  endpoints and the observed mapping. Proxies/NAT/load balancers can introduce
  intermediate endpoints. Docker metadata is not socket-owner proof.
- Resolve only literal configuration endpoints. Named upstreams link through
  their known members; variable targets remain unresolved. DNS names remain
  declarations unless a separately authorized evidence source supplies resolution.
- Port reuse, PID reuse, stale captures, multiple namespaces and competing owners
  prevent a unique confirmed correlation. Preserve all candidates and rationale.
- Keep snapshot time windows visible. Contradictory or incomplete observations
  lower classification; they do not erase the configured graph.

## Dependency and testing gates

Evaluate small optional Linux/systemd/Docker clients when those adapter PRs begin;
no library/version is selected prematurely. Prefer typed, bounded read-only APIs
over shell parsing. If a CLI fallback is necessary, use fixed argument arrays,
timeouts/output limits and no shell; make executable selection explicit.

Fixture matrix: literal/local/wildcard/IPv6/Unix endpoints; host/bridge/rootless
containers; multiple published ports; mismatched namespaces; system/user managers;
socket activation; stale captures; PID/port reuse; denied access; empty/malformed
snapshots; conflicting observations; secret-bearing ignored fields. Test a pure
correlator independently of live machines. Live adapter tests are opt-in and never
required for ordinary workspace tests or static mapping. Acceptance requires every
correlation to carry evidence and no runtime work from default `map`.

## Primary references reviewed

- [Docker Engine API](https://docs.docker.com/reference/api/engine/) — versioned
  API surface and negotiation; inspect the exact supported API version at implementation.
- [systemd D-Bus API](https://www.freedesktop.org/software/systemd/man/latest/org.freedesktop.systemd1.html)
  — manager/unit/service objects and properties; expose read operations only.
- [Linux proc/net/tcp documentation](https://docs.kernel.org/networking/proc_net_tcp.html)
  — TCP listener fields and the documented preference for socket diagnostics.

These sources inform the proposal; no calls to Docker, systemd or process
discovery were made in this work.
