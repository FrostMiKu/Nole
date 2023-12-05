import { sortBy, randomString } from "remeda";
import { FileEntry } from "@tauri-apps/api/fs";
import { DataNode, Key } from "rc-tree/lib/interface";
import path from "path-browserify";

export type FileTreeNode = {
  pathpoint: string;
  children?: FileTreeNode[];
} & DataNode;

export const sortNodesByPathpoint = sortBy<FileTreeNode>(
    [(file) => !file.children, "asc"],
    [(file) => file.pathpoint, "asc"]
  );

function makeTitle(filename: string, isDir: boolean) {
  if (isDir) {
    return "📁 " + filename;
  }
  const p = path.parse(filename);
  switch (p.ext) {
    case ".typ":
      filename = "📝 " + p.name;
      break;
    case ".draw":
      filename = "🎨 " + p.name;
      break;
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".gif":
    case ".svg":
    case ".bmp":
      filename = "🖼️ " + p.name;
      break;
    case ".pdf":
      filename = "📑 " + p.name;
      break;
    case ".zip":
    case ".tar":
    case ".gz":
    case ".bz2":
    case ".xz":
    case ".7z":
      filename = "📚 " + p.name;
      break;
    default:
      filename = "🤔 " + p.base;
      break;
  }
  return filename;
}

export function convertPathToFileTreeNode(nodepath: string, isDir: boolean): FileTreeNode {
  const p = path.parse(nodepath);
  return {
    key: randomString(6),
    title: makeTitle(p.base, isDir), // todo: apply filter
    isLeaf: !isDir,
    pathpoint: p.base,
    children: isDir ? [] : undefined,
  };
}

export function convertToTreeNodeInfo(files: FileEntry[]): FileTreeNode[] {
  const result: FileTreeNode[] = [];
  files.forEach((file) => {
    if (file.name === undefined || file.name.startsWith(".")) {
      return;
    }
    result.push(convertPathToFileTreeNode(file.path, file.children !== undefined));
  });
  return sortNodesByPathpoint(result);
}

export function getPath(tree: FileTreeNode[], pos: string): string {
  const nodepath:string[] = [];
  const nodeidx = pos.split("-");
  nodeidx.shift();
  
  for (const i of nodeidx) {    
    nodepath.push(tree[parseInt(i)].pathpoint);
    tree = tree[parseInt(i)].children!;
  }
  return path.join(...nodepath);
}

export function findNode(tree: FileTreeNode[], pos: string) {
  let node: FileTreeNode | undefined;
  const nodeidx = pos.split("-");
  nodeidx.shift();
  for (const i of nodeidx) {
    node = tree[parseInt(i)];
    tree = tree[parseInt(i)].children!;
  }
  return node;
}

export function findNodeByKey(
  key: Key,
  nodes: DataNode[]
): DataNode | undefined {
  for (const node of nodes) {
    if (node.key === key) {
      return node;
    }

    if (node.children) {
      const foundInChild = findNodeByKey(key, node.children);
      if (foundInChild) {
        return foundInChild;
      }
    }
  }
  return undefined;
}

// tree must start with root node
export function findNodeByPath(tree: FileTreeNode[], nodepath: string) {
  if (nodepath === window.nole!.workspace()!) {
    return tree[0];
  }
  let node: FileTreeNode | undefined;
  tree = tree[0].children!;
  const pathpoint = splitPathAfterBase(nodepath, window.nole!.workspace()!);
  
  for (const i of pathpoint) {
    node = tree.find((node) => node.pathpoint === i);
    if (node !== undefined) {
      tree = node.children!;
    }
  }
  return node;
}

export function removeChildrenNodes(tree: FileTreeNode[], pos: string) {
  const node = findNode(tree, pos);
  if (node !== undefined) {
    node.children = [];
  }
  return tree;
}

export function findParentNode(tree: FileTreeNode[], pos: string) {
  const nodeidx = pos.split("-");
  nodeidx.pop();
  return findNode(tree, nodeidx.join("-"));
}

export function insertChildren(
  tree: FileTreeNode[],
  pos: string,
  children: FileTreeNode[]
) {
  const node = findNode(tree, pos);
  if (node !== undefined && !node.isLeaf) {
      node.children = children;
  }
  return tree;
}

export function deleteNode(tree: FileTreeNode[], pos: string) {
  const node = findNode(tree, pos);
  if (node !== undefined) {
    const parent = findParentNode(tree, pos);
    if (parent !== undefined) {
      parent.children = parent.children!.filter(
        (child) => child.key !== node.key
      );
    }
  }
  return tree;
}

export const STYLE = `
    .node-motion {
      transition: all .3s;
      overflow-y: hidden;
    }
    `;

export const motion = {
  motionName: "node-motion",
  motionAppear: false,
  onAppearStart: (_: HTMLElement) => {
    return { height: 0 };
  },
  onAppearActive: (node: HTMLElement) => ({ height: node.scrollHeight }),
  onLeaveStart: (node: HTMLElement) => ({ height: node.offsetHeight }),
  onLeaveActive: () => ({ height: 0 }),
};

function splitPathAfterBase(inputPath: string, basePath: string) {
  // Find the index of the base path in the string
  const basePathIndex = inputPath.indexOf(basePath);

  // If the base path doesn't exist, return an empty array
  if (basePathIndex === -1) {
      return [];
  }

  // Extract the portion of the string after the base path
  const remainingPath = inputPath.substring(basePathIndex + basePath.length);
  const pathArray = remainingPath.split(path.sep).filter(Boolean); // filter(Boolean) removes empty strings

  return pathArray;
}

