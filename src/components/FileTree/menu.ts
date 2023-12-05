import { type ContextMenu } from "tauri-plugin-context-menu";
import { DataNode, EventDataNode } from "rc-tree/lib/interface";
import { FileTreeNode, getPath } from "./utils";
import path from "path-browserify";

type MenuProps = {
  node: EventDataNode<DataNode>;
  treeData: FileTreeNode[];
  setEditPos: React.Dispatch<React.SetStateAction<string|null>>;
};

export const DirContextMenu: (props: MenuProps) => ContextMenu.Item[] = ({
  node,
  setEditPos,
  treeData,
}) => [
  {
    label: "New File",
    event: () => {
      window.nole!.fs
        .tryCreateFile(path.join(getPath(treeData, node.pos), "Untitled.typ"))
        .catch((err) => {
          window.nole!.notify.error({ content: err });
        });
    },
  },
  {
    label: "New Folder",
    event: () => {
      window.nole!.fs
        .tryCreateDir(path.join(getPath(treeData, node.pos), "Untitled"))
        .catch((err) => {
          window.nole!.notify.error({ content: err });
        });
    },
  },
  {
    label: "Rename",
    event: () => {
      setEditPos(node.pos);
    },
  },
  {
    label: "Delete",
    event: () => {
      const dirpath = getPath(treeData, node.pos);
      window.nole!.fs.delectDir(dirpath, true).catch((err) => {
        window.nole!.notify.error({ content: err });
      });
    },
  },
];

export const FileContextMenu: (props: MenuProps) => ContextMenu.Item[] = ({
  node,
  setEditPos,
  treeData,
}) => [
  {
    label: "Open",
    event: () => {
      const filepath = getPath(treeData, node.pos);
      window.nole!.fs.openFile(filepath).catch((err) => {
        window.nole!.notify.error({ content: err });
      });
    },
  },
  {
    label: "Rename",
    event: () => {
      setEditPos(node.pos);
    },
  },
  {
    label: "Delete",
    event: () => {
      const filepath = getPath(treeData, node.pos);
      window.nole!.fs.deleteFile(filepath).catch((err) => {
        window.nole!.notify.error({ content: err });
      });
    },
  },
];
