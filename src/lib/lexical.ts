interface LexicalNode {
  text?: string;
  children?: LexicalNode[];
}

function hasText(node: LexicalNode): boolean {
  if (node.text && node.text.trim().length > 0) return true;
  return node.children?.some(hasText) ?? false;
}

// True when a serialized Lexical document (ExtensiveEditorRef.getJSON())
// contains any non-whitespace text.
export function hasLexicalText(json: string): boolean {
  if (!json) return false;
  try {
    const parsed = JSON.parse(json);
    return hasText(parsed.root);
  } catch {
    return false;
  }
}

// A Lexical document with one paragraph per line of `text`, in the shape
// ExtensiveEditorRef.getJSON() produces. Used where a description arrives as
// plain text (the kanby CLI). Empty text stays "", like a new task's.
export function plainTextToLexical(text: string): string {
  if (!text.trim()) return "";
  const paragraph = (line: string) => ({
    children: line
      ? [{
        detail: 0,
        format: 0,
        mode: "normal",
        style: "",
        text: line,
        type: "text",
        version: 1,
      }]
      : [],
    direction: null,
    format: "",
    indent: 0,
    type: "paragraph",
    version: 1,
    textFormat: 0,
    textStyle: "",
  });
  return JSON.stringify({
    root: {
      children: text.split(/\r?\n/).map(paragraph),
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });
}

function blockText(node: LexicalNode): string {
  if (node.text !== undefined) return node.text;
  return node.children?.map(blockText).join("") ?? "";
}

// The plain text of a serialized Lexical document, one line per top-level
// block. Formatting is dropped. Unparseable input is returned as is.
export function lexicalToPlainText(json: string): string {
  if (!json) return "";
  try {
    const root: LexicalNode = JSON.parse(json).root;
    return root.children?.map(blockText).join("\n") ?? "";
  } catch {
    return json;
  }
}
