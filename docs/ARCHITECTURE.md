# Architecture

```text
nginx.conf / includes → parser → static analyzer → versioned Topology
                                                       ├─ JSON
                                                       ├─ DOT
                                                       ├─ SVG (planned)
                                                       └─ offline HTML (planned)
                                   ↑
                v0.2 opt-in discovery adapters
```

- **nasj-core:** normalized topology and future parsing/analysis.
- **nasj-export:** format-specific renderers consuming the same topology.
- **nasj-cli:** CLI arguments and IO; never performs unrequested config mutations.

The parser must preserve source provenance and expose uncertainty instead of guessing. No Nginx reload, implicit privileged access, or network telemetry.
