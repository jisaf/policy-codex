import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");

describe("documentation link integrity", () => {
  function extractLinksFromMarkdown(content: string, docPath: string): Array<{ link: string; line: number }> {
    const links: Array<{ link: string; line: number }> = [];
    const lines = content.split("\n");
    // Match [text](path) but exclude http/https/mailto links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

    lines.forEach((line, lineIndex) => {
      let match;
      const regex = new RegExp(linkRegex.source, "g");
      while ((match = regex.exec(line)) !== null) {
        const linkPath = match[2];
        // Skip URLs and mailto links
        if (!linkPath.startsWith("http://") && !linkPath.startsWith("https://") && !linkPath.startsWith("mailto:")) {
          // Extract just the file path (before any # or ?)
          const filePath = linkPath.split("#")[0].split("?")[0];
          if (filePath) {
            links.push({ link: filePath, line: lineIndex + 1 });
          }
        }
      }
    });
    return links;
  }

  it("README.md links resolve to existing files", () => {
    const readmePath = join(ROOT, "README.md");
    const content = readFileSync(readmePath, "utf8");
    const links = extractLinksFromMarkdown(content, "README.md");

    const missing: string[] = [];
    for (const { link, line } of links) {
      const targetPath = join(ROOT, link);
      if (!existsSync(targetPath)) {
        missing.push(`Line ${line}: ${link}`);
      }
    }

    expect(missing, `README.md has broken links:\n${missing.join("\n")}`).toEqual([]);
  });

  it("docs/ markdown files have links that resolve", () => {
    const docsDir = join(ROOT, "docs");
    const docFiles = readdirSync(docsDir).filter((f) => f.endsWith(".md"));

    const allMissing: Array<{ file: string; link: string; line: number }> = [];

    for (const docFile of docFiles) {
      const docPath = join(docsDir, docFile);
      const content = readFileSync(docPath, "utf8");
      const links = extractLinksFromMarkdown(content, docFile);

      for (const { link, line } of links) {
        // Links in docs/ are relative to docs/ directory
        const targetPath = join(docsDir, link);
        if (!existsSync(targetPath)) {
          allMissing.push({ file: docFile, link, line });
        }
      }
    }

    const messages = allMissing.map(
      ({ file, link, line }) => `${file}:${line} -> ${link}`
    );
    expect(messages, `docs/ has broken links:\n${messages.join("\n")}`).toEqual([]);
  });
});
