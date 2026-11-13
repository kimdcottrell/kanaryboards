// Parses Mermaid diagrams with the mermaid devDependency, so syntax errors
// surface before a diagram is committed. Checks the files passed as arguments,
// or every .mmd under docs/ if none are given. Exits 1 if any fail.
import mermaid from "mermaid";

const files = Deno.args.length > 0 ? Deno.args : await findMmd("docs");

async function findMmd(dir: string): Promise<string[]> {
  const found: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) found.push(...await findMmd(path));
    else if (entry.name.endsWith(".mmd")) found.push(path);
  }
  return found.sort();
}

let failed = false;
for (const file of files) {
  try {
    await mermaid.parse(await Deno.readTextFile(file));
    console.log(`OK   ${file}`);
  } catch (error) {
    failed = true;
    console.log(`FAIL ${file}\n${(error as Error).message}\n`);
  }
}
if (failed) Deno.exit(1);
