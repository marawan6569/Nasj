// Inserted before CSS; astro.config.mjs authorizes its exact compiled bytes.
// No client framework, network request, or dependency on persistent storage.
const root = document.documentElement;
const key = "nasj.website.theme";
const system = matchMedia("(prefers-color-scheme: dark)");
type Preference = "system" | "light" | "dark";
const validate = (value: unknown): Preference =>
    value === "dark" || value === "light" ? value : "system";
let preference: Preference = "system";
try {
    preference = validate(localStorage.getItem(key));
} catch {
    /* ephemeral mode */
}
function apply() {
    const theme =
        preference === "system"
            ? system.matches
                ? "dark"
                : "light"
            : preference;
    root.dataset["theme"] = theme;
    root.dataset["preference"] = preference;
    document
        .querySelectorAll<HTMLSelectElement>("[data-theme-control]")
        .forEach((control) => {
            control.value = preference;
        });
    // Select the correct existing asset without recoloring it. Media queries remain
    // the no-JavaScript fallback; each picture selects the current theme asset.
    document
        .querySelectorAll<HTMLSourceElement>("source[data-theme-source]")
        .forEach((source) => {
            source.media =
                source.dataset["themeSource"] === theme ? "all" : "not all";
        });
}
apply();
root.classList.add("js");
system.addEventListener("change", () => {
    if (preference === "system") apply();
});
window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) {
        preference = validate(event.newValue);
        apply();
    }
});
document.addEventListener("DOMContentLoaded", () => {
    apply();
    document
        .querySelectorAll<HTMLSelectElement>("[data-theme-control]")
        .forEach((control) => {
            control.addEventListener("change", () => {
                preference = validate(control.value);
                try {
                    localStorage.setItem(key, preference);
                } catch {
                    /* still works this visit */
                }
                apply();
            });
        });
    const menu = document.querySelector<HTMLDetailsElement>("[data-menu]");
    menu?.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            menu.open = false;
            menu.querySelector("summary")?.focus();
        }
    });
    menu?.querySelectorAll("a").forEach((link) =>
        link.addEventListener("click", () => {
            menu.open = false;
        }),
    );
    const language =
        document.querySelector<HTMLAnchorElement>("[data-language]");
    language?.addEventListener("click", () => {
        language.hash = location.hash;
    });
});
