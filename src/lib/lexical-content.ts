interface LexicalNode {
  text?: string;
  children?: LexicalNode[];
}

function hasText(node: LexicalNode): boolean {
  if (node.text && node.text.trim().length > 0) return true;
  return node.children?.some(hasText) ?? false;
}

export function hasDescriptionContent(description: string): boolean {
  if (!description) return false;
  try {
    const parsed = JSON.parse(description);
    return hasText(parsed.root);
  } catch {
    return false;
  }
}
