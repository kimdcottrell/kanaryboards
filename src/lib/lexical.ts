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
