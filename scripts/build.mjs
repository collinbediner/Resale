import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const release = (process.env.RELEASE_ID || "local")
  .replace(/[^a-zA-Z0-9_-]/g, "")
  .slice(0, 40) || "local";
const source = new URL("../site/", import.meta.url);
const output = new URL("../dist/", import.meta.url);
const names = {
  css: `styles.${release}.css`,
  app: `app.${release}.js`,
  cart: `cart-logic.${release}.js`
};

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL("assets/", source), new URL("assets/", output), { recursive: true });
await cp(new URL("CNAME", source), new URL("CNAME", output));

const html = (await readFile(new URL("index.html", source), "utf8"))
  .replace('data-release="source"', `data-release="${release}"`)
  .replace("./styles.css", `./${names.css}`)
  .replace("./app.js", `./${names.app}`);
const app = (await readFile(new URL("app.js", source), "utf8"))
  .replace("./cart-logic.js", `./${names.cart}`);

await writeFile(new URL("index.html", output), html);
await writeFile(new URL(names.css, output), await readFile(new URL("styles.css", source)));
await writeFile(new URL(names.app, output), app);
await writeFile(new URL(names.cart, output), await readFile(new URL("cart-logic.js", source)));
await writeFile(new URL("release.json", output), `${JSON.stringify({ release }, null, 2)}\n`);

console.log(`Built release ${release}`);
