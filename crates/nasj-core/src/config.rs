//! Explicit, bounded, read-only configuration input and include expansion.
use crate::{
    analyze,
    syntax::{self, Directive, ParseError},
    SourceLocation, Topology, Warning,
};
use std::{
    collections::BTreeSet,
    fs::{self, OpenOptions},
    io::Read,
    path::{Path, PathBuf},
};

const MAX_TOTAL_BYTES: usize = 16 * 1024 * 1024;
const MAX_FILES: usize = 1024;
const MAX_INCLUDE_DEPTH: usize = 32;

#[derive(Debug, Clone, Default)]
pub struct AnalysisOptions {
    /// Nginx configuration prefix; defaults to the selected root file's parent.
    pub prefix: Option<PathBuf>,
    /// Explicitly permit includes whose canonical path lies outside the prefix.
    pub allow_external_includes: bool,
}

struct Resolver {
    prefix: PathBuf,
    allow_external: bool,
    active: Vec<PathBuf>,
    sources: BTreeSet<String>,
    warnings: Vec<Warning>,
    bytes: usize,
    files: usize,
}

fn error(code: &'static str, message: &'static str, source: &SourceLocation) -> ParseError {
    ParseError {
        code,
        message,
        source: source.clone(),
    }
}

impl Resolver {
    fn load(
        &mut self,
        path: &Path,
        origin: &SourceLocation,
        depth: usize,
    ) -> Result<Vec<Directive>, ParseError> {
        if self.active.len() >= MAX_INCLUDE_DEPTH || self.files >= MAX_FILES {
            return Err(error(
                "limit.includes",
                "include file/depth limit exceeded",
                origin,
            ));
        }
        let path = fs::canonicalize(path)
            .map_err(|_| error("input.path", "cannot resolve configuration path", origin))?;
        if !self.active.is_empty() && !self.allow_external && !path.starts_with(&self.prefix) {
            return Err(error(
                "include.scope",
                "include escapes configuration prefix; explicit opt-in required",
                origin,
            ));
        }
        if self.active.contains(&path) {
            return Err(error("include.cycle", "recursive include cycle", origin));
        }
        if !fs::metadata(&path).is_ok_and(|meta| meta.is_file()) {
            return Err(error(
                "input.type",
                "configuration input must be a regular file",
                origin,
            ));
        }
        let mut options = OpenOptions::new();
        options.read(true);
        // Avoid blocking on a file swapped for a FIFO between metadata/open.
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.custom_flags(libc::O_NONBLOCK);
        }
        let file = options
            .open(&path)
            .map_err(|_| error("input.read", "cannot open configuration file", origin))?;
        if !file.metadata().is_ok_and(|meta| meta.is_file()) {
            return Err(error(
                "input.type",
                "configuration input must be a regular file",
                origin,
            ));
        }
        let mut bytes = Vec::new();
        file.take((syntax::MAX_FILE_BYTES + 1) as u64)
            .read_to_end(&mut bytes)
            .map_err(|_| error("input.read", "cannot read configuration file", origin))?;
        self.bytes += bytes.len();
        self.files += 1;
        if bytes.len() > syntax::MAX_FILE_BYTES || self.bytes > MAX_TOTAL_BYTES {
            return Err(error(
                "limit.bytes",
                "configuration byte budget exceeded",
                origin,
            ));
        }
        let text = std::str::from_utf8(&bytes)
            .map_err(|_| error("input.encoding", "configuration must be UTF-8", origin))?;
        let display = path.to_string_lossy().into_owned();
        let tree = syntax::parse(text, &display)?;
        self.sources.insert(display);
        self.active.push(path);
        let result = self.expand(tree, depth);
        self.active.pop();
        result
    }

    fn expand(&mut self, tree: Vec<Directive>, depth: usize) -> Result<Vec<Directive>, ParseError> {
        let mut output = Vec::new();
        for mut directive in tree {
            if depth > syntax::MAX_NESTING {
                return Err(error(
                    "limit.nesting",
                    "expanded configuration nesting limit exceeded",
                    &directive.source,
                ));
            }
            if directive.name == "include" {
                if directive.args.len() != 1 || directive.children.is_some() {
                    return Err(error(
                        "include.arguments",
                        "include requires one path",
                        &directive.source,
                    ));
                }
                let pattern = &directive.args[0];
                if pattern.contains('$') {
                    return Err(error(
                        "include.dynamic",
                        "dynamic includes cannot be resolved statically",
                        &directive.source,
                    ));
                }
                let path = Path::new(pattern);
                if pattern.contains(['*', '?', '[']) {
                    let mut full_pattern = if path.is_absolute() {
                        pattern.clone()
                    } else {
                        format!(
                            "{}/{}",
                            glob::Pattern::escape(&self.prefix.to_string_lossy()),
                            pattern
                        )
                    };
                    // libc glob (used by Nginx) has no recursive `**` operator.
                    while full_pattern.contains("**") {
                        full_pattern = full_pattern.replace("**", "*");
                    }
                    let mut paths = Vec::new();
                    for entry in glob::glob(&full_pattern).map_err(|_| {
                        error("include.glob", "invalid include glob", &directive.source)
                    })? {
                        paths.push(entry.map_err(|_| {
                            error(
                                "include.read",
                                "cannot enumerate include glob",
                                &directive.source,
                            )
                        })?);
                        if paths.len() > MAX_FILES {
                            return Err(error(
                                "limit.includes",
                                "too many include matches",
                                &directive.source,
                            ));
                        }
                    }
                    paths.sort();
                    if paths.is_empty() {
                        self.warnings.push(Warning {
                            code: "include.empty".into(),
                            message: "include glob matched no files".into(),
                            source: Some(directive.source.clone()),
                        });
                    }
                    for path in paths {
                        output.extend(self.load(&path, &directive.source, depth)?);
                    }
                } else {
                    let path = if path.is_absolute() {
                        path.to_path_buf()
                    } else {
                        self.prefix.join(path)
                    };
                    output.extend(self.load(&path, &directive.source, depth)?);
                }
            } else {
                if let Some(children) = directive.children.take() {
                    directive.children = Some(self.expand(children, depth + 1)?);
                }
                output.push(directive);
            }
        }
        Ok(output)
    }
}

/// Analyze the selected file and only its declared includes. Errors prevent a
/// partial graph from being mistaken for a complete configuration map.
pub fn analyze_file(path: &Path, options: &AnalysisOptions) -> Result<Topology, ParseError> {
    let origin = SourceLocation {
        path: path.to_string_lossy().into_owned(),
        line: 1,
    };
    let root = fs::canonicalize(path)
        .map_err(|_| error("input.path", "cannot resolve configuration path", &origin))?;
    let prefix = options
        .prefix
        .as_deref()
        .or_else(|| root.parent())
        .ok_or_else(|| {
            error(
                "input.prefix",
                "configuration prefix is unavailable",
                &origin,
            )
        })?;
    let prefix = fs::canonicalize(prefix).map_err(|_| {
        error(
            "input.prefix",
            "cannot resolve configuration prefix",
            &origin,
        )
    })?;
    if !prefix.is_dir() {
        return Err(error(
            "input.prefix",
            "configuration prefix must be a directory",
            &origin,
        ));
    }
    let mut resolver = Resolver {
        prefix,
        allow_external: options.allow_external_includes,
        active: Vec::new(),
        sources: BTreeSet::new(),
        warnings: Vec::new(),
        bytes: 0,
        files: 0,
    };
    let tree = resolver.load(&root, &origin, 0)?;
    let mut topology = analyze::analyze(&tree);
    topology.sources = resolver.sources.into_iter().collect();
    topology.warnings.splice(0..0, resolver.warnings);
    Ok(topology)
}
