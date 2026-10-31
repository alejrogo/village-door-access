import path from "node:path";
import { pathToFileURL } from "node:url";

const srcRoot = path.join(import.meta.dirname, "..", "src");
const knownSpecifierExtension = /\.(?<ext>ts|tsx|js|mjs|cjs|json)$/iu;

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let rel = specifier.slice(2);
    if (!knownSpecifierExtension.test(rel)) {
      rel = `${rel}.ts`;
    }
    return nextResolve(pathToFileURL(path.join(srcRoot, rel)).href, context);
  }
  return nextResolve(specifier, context);
}
