import { type ContextMenu } from "tauri-plugin-context-menu";
import { DataNode, EventDataNode } from "rc-tree/lib/interface";
import { FileTreeNode, getPath } from "./utils";
import path from "path-browserify";

type MenuProps = {
  node: EventDataNode<DataNode>;
  treeData: FileTreeNode[];
  setEditPos: React.Dispatch<React.SetStateAction<string | null>>;
};

export const DirContextMenu: (props: MenuProps) => ContextMenu.Item[] = ({
  node,
  setEditPos,
  treeData,
}) => [
  {
    label: "New File",
    event: () => {
      window
        .nole!.fs.tryCreateFile(
          path.join(getPath(treeData, node.pos), "Untitled.typ")
        )
        .catch((err) => {
          window.nole!.notify.error({ content: err });
        });
    },
  },
  {
    label: "New Canvas",
    event: () => {
      window
        .nole!.fs.tryCreateFile(
          path.join(getPath(treeData, node.pos),"Untitled.draw")
        )
        .then((file) => {
          file.writeAsBinary(
            []
          );
        })
        .catch((err) => {
          window.nole!.notify.error({ content: err });
        });
    },
  },
  {
    label: "New Folder",
    event: () => {
      window
        .nole!.fs.tryCreateDir(
          path.join(getPath(treeData, node.pos), "Untitled")
        )
        .catch((err) => {
          window.nole!.notify.error({ content: err });
        });
    },
  },
  {
    label: "Rename",
    event: () => {      
      if (node.pos === "0-0") {
        window.nole.notify.warn({content:"Workspace root node can not rename!"})
        return
      }
      setEditPos(node.pos);
    },
  },
  {
    label: "Open in Explorer",
    event: () => {
      const dirpath = getPath(treeData, node.pos);
      window.nole!.fs.openExplorer(dirpath).catch((err) => {
        window.nole!.notify.error({ content: err });
      });
    },
  },
  {
    is_separator: true,
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
    label: "Open in Explorer",
    event: () => {
      const parentPos = node.pos.split("-").slice(0, -1).join("-");
      const dirpath = getPath(treeData, parentPos);
      window.nole!.fs.openExplorer(dirpath).catch((err) => {
        window.nole!.notify.error({ content: err });
      });
    },
  },
  {
    is_separator: true,
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
