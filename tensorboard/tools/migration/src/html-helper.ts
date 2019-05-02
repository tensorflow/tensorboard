export type Node = {
  nodeName: string;
  tagName: string;
  childNodes: Node[];
  attrs: Array<{
    name: string;
    value: string;
  }>;
};

export function findScripts(node: Node): Node[] {
  if (node.tagName === 'script') return [node];
  return (node.childNodes || []).reduce((result: Node[], node: Node) => {
    result.push(...findScripts(node));
    return result;
  }, []);
}
