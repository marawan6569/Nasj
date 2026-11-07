import release from "../data/release.json" with { type: "json" };
export { release };
export function selectedAsset(name) {
    const asset = release.assets.find((a) => a.name === name && a.manifest);
    if (!asset) throw new Error("Unknown release distribution");
    return asset;
}
// A subshell makes failure stop even when pasted into an interactive shell.
// Verify BOTH the reviewed manifest and the exact selected asset, never a partial
// --ignore-missing success for an unrelated file. No network script execution.
export function installCommands(name) {
    const asset = selectedAsset(name);
    const manifest = release.assets.find((a) => a.name === asset.manifest);
    const lines = [
        "(",
        "set -eu",
        "workdir=$(mktemp -d)",
        'cd "$workdir"',
        `curl --fail --location --proto '=https' --proto-redir '=https' --output '${name}' '${release.url}${name}'`,
        `curl --fail --location --proto '=https' --proto-redir '=https' --output '${manifest.name}' '${release.url}${manifest.name}'`,
        `printf '%s\\n' '${manifest.sha256}  ${manifest.name}' | sha256sum --check --strict -`,
        `printf '%s\\n' '${asset.sha256}  ${name}' | sha256sum --check --strict -`,
    ];
    if (name.endsWith(".deb"))
        lines.push(`sudo apt install './${name}'`, "nasj --version");
    else if (name.includes("-source."))
        lines.push(
            `tar -xzf '${name}'`,
            "cd nasj-v0.1.0",
            "cargo install --locked --path crates/nasj-cli",
            "nasj --version",
        );
    else {
        const directory = name.replace(/\.tar\.gz$/, "");
        lines.push(
            `tar -xzf '${name}'`,
            'mkdir -p "$HOME/.local/bin" "$HOME/.local/share/nasj"',
            `cp -R '${directory}' "$HOME/.local/share/nasj/"`,
            `install -m 0755 '${directory}/nasj' "$HOME/.local/bin/nasj"`,
            '"$HOME/.local/bin/nasj" --version',
        );
    }
    lines.push(")");
    return lines.join("\n");
}
