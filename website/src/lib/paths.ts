export type Locale = "en" | "ar";
export const basePath = import.meta.env.BASE_URL.replace(/\/?$/, "/");
/** Accept repository-owned relative paths only, independent of the host/base. */
export function asset(path: string): string {
    if (/^(?:[a-z]+:|\/\/)/i.test(path) || path.split("/").includes("..")) {
        throw new Error("Expected a local asset path");
    }
    return basePath + path.replace(/^\/+/, "");
}
export const home = (locale: Locale) => asset(locale === "ar" ? "ar/" : "");
export const demo = (locale: Locale) =>
    asset(locale === "ar" ? "ar/demo/" : "demo/");
export const repository = "https://github.com/marawan6569/Nasj";
export const documentation = (locale: Locale) =>
    `${repository}/blob/main/${locale === "ar" ? "README.ar.md" : "README.md"}`;

export const contentRoutes = [
    "install",
    "docs",
    "compatibility",
    "roadmap",
    "licenses",
] as const;
export type ContentRoute = (typeof contentRoutes)[number];
export const pagePath = (locale: Locale, slug = "") =>
    home(locale) + (slug ? slug + "/" : "");
