import matter from "gray-matter";
import yaml from "js-yaml";

export interface MarkdownEntry<T extends object> {
  data: T;
  content: string;
}

export function parseMarkdownEntry<T extends object>(text: string): MarkdownEntry<T> {
  const parsed = matter(text);
  return {
    data: (parsed.data ?? {}) as T,
    content: parsed.content.trimStart()
  };
}

export function stringifyMarkdownEntry<T extends object>(data: T, content: string): string {
  const frontmatter = yaml.dump(data, { noRefs: true, lineWidth: 100 }).trimEnd();
  const body = content.trimStart();
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}
