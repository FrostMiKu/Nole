import "rc-tree/assets/index.css";
import Tree from "rc-tree";
import { TreeProps } from "rc-tree/lib/Tree";
import { Key, useEffect, useState } from "react";
import {
  convertToTreeNodeInfo,
  getPath,
  insertChildren,
  STYLE,
  FileTreeNode,
  findNodeByPath,
  convertPathToFileTreeNode,
  sortNodesByPathpoint,
  findNode,
} from "./utils";
import { showMenu } from "tauri-plugin-context-menu";
import { DirContextMenu, FileContextMenu } from "./menu";
import path from "path-browserify";
import RenameInputer from "./RenameInputer";
import { UIEvent } from "../../lib/bus";

type OnExpandFn = TreeProps["onExpand"];
type OnDropFn = TreeProps["onDrop"];
type OnSelectFn = TreeProps["onSelect"];
type LoadFn = TreeProps["loadData"];


const FileTree: React.FC = () => {
  const [hiddenFileTree, setHiddenFileTree] = useState<boolean>(false);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([
    window.nole!.workspace()!,
  ]);
  const [treeData, setTreeData] = useState<FileTreeNode[]>([
    {
      key: window.nole!.workspace()!,
      title: "⭐ Nólë",
      isLeaf: false,
      pathpoint: window.nole!.workspace()!,
    },
  ]);
  const [editPos, setEditPos] = useState<string | null>(null);

  useEffect(() => {
    window.nole.bus.on(UIEvent.ToggleFileTree, () => {
      setHiddenFileTree(!hiddenFileTree);
    })
  },[hiddenFileTree])

  useEffect(() => {
    const disposers: (() => void)[] = [];
    disposers.push(
      window.nole!.fs.onFileCreated((file) => {
        const tree = [...treeData];
        const parent = findNodeByPath(tree, file.parent);
        if (parent !== undefined) {
          parent.children = sortNodesByPathpoint([
            ...parent.children!,
            convertPathToFileTreeNode(file.path, false),
          ]);
          setTreeData([...tree]);
        }
      }),
      window.nole!.fs.onDirCreated((dirpath) => {
        const tree = [...treeData];
        const parent = findNodeByPath(tree, path.dirname(dirpath));
        if (parent !== undefined) {
          parent.children = sortNodesByPathpoint([
            ...parent.children!,
            convertPathToFileTreeNode(dirpath, true),
          ]);
          setTreeData([...tree]);
        }
      }),
      window.nole!.fs.onMoved((from, to) => {
        const tree = [...treeData];
        const fromParent = path.dirname(from);
        const toParent = path.dirname(to);
        const fromNodeParent = findNodeByPath(tree, fromParent);
        // const fromNode = findNodeByPath(tree, from);
        const fromNode = fromNodeParent?.children?.find(
          (node) => node.pathpoint === path.basename(from)
        );
        let toNodeParent = fromNodeParent;
        if (fromParent !== toParent) {
          toNodeParent = findNodeByPath(tree, toParent);
        }
        if (
          fromNode !== undefined &&
          toNodeParent !== undefined &&
          fromNodeParent !== undefined
        ) {
          // consider the case where the node renamed
          const node = convertPathToFileTreeNode(to, !fromNode?.isLeaf!);
          fromNodeParent.children = fromNodeParent.children!.filter(
            (node) => node.key !== fromNode.key
          );
          toNodeParent.children = sortNodesByPathpoint([
            ...toNodeParent.children!,
            node,
          ]);
          setTreeData([...tree]);
        }
      }),
      window.nole!.fs.onFileDeleted((filepath) => {
        const tree = [...treeData];
        const parent = findNodeByPath(tree, path.dirname(filepath));
        if (parent !== undefined) {
          parent.children = parent.children!.filter(
            (node) => node.pathpoint !== path.basename(filepath)
          );
          setTreeData([...tree]);
        }
      }),
      window.nole!.fs.onDirDeleted((dirpath) => {
        const tree = [...treeData];
        const parent = findNodeByPath(tree, path.dirname(dirpath));
        if (parent !== undefined) {
          parent.children = parent.children!.filter(
            (node) => node.pathpoint !== path.basename(dirpath)
          );
          setTreeData([...tree]);
        }
      }),
    );
    return () => {
      disposers.forEach((disposer) => disposer());
    };
  }, []);

  const onExpand: OnExpandFn = (expandedKeys: Key[]) => {
    setExpandedKeys(expandedKeys);
  };
  const onDrop: OnDropFn = (info) => {
    // We ensure through allowDrop that the target node is definitely a directory.
    const from = getPath(treeData, info.dragNode.pos);
    const to = path.join(getPath(treeData, info.node.pos), path.basename(from));
    window
      .nole!.fs.move(from, to)
      .catch((err) => {
        window.nole!.notify.error({ content: err });
      });
  };

  const loadData: LoadFn = async (node) => {
    const dirpath = getPath(treeData, node.pos);

    const dir = await window.nole!.fs.listDir(dirpath);
    const children = convertToTreeNodeInfo(dir);
    const tree = [...treeData];
    insertChildren(tree, node.pos, children);
    setTreeData([...tree]);
  };

  const onSelect: OnSelectFn = (keys, info) => {
    if (!info.node.isLeaf || keys.length === 0) {
      return;
    }
    const filepath = getPath(treeData, info.node.pos);
    window.nole!.fs.openFile(filepath).catch((e) => {
      window.nole!.notify.error({ content: e as string });
    });
  };

  useEffect(() => {
    if (editPos !== null) {
      const tree = [...treeData];
      const node = findNode(tree, editPos);
      const filepath = getPath(tree, editPos);
      if (node !== undefined) {
        const oldtitle = node.title;
        node.title = (
          <RenameInputer
            filename={node.pathpoint}
            onRename={(newFilename) => {
              const newpath = path.join(path.dirname(filepath), newFilename);
              window.nole!.fs.move(filepath, newpath).catch((e) => {
                window.nole!.notify.error({ content: e as string });
                node.title = oldtitle;
                setTreeData([...tree]);
              });
              setEditPos(null);
            }}
          />
        );
        setTreeData([...tree]);
      }
    }
  }, [editPos]);

  return (
    <div className={"min-w-52 w-52 lg:w-60 bg-gray-100 overflow-hidden " + (hiddenFileTree?"hidden":"")}>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <Tree
        className="bg-slate-100 w-full h-full overflow-y-auto overflow-x-hidden"
        virtual
        showIcon={false}
        draggable={(node) => {
          return typeof node.title === "string";
        }}
        autoExpandParent={false}
        // motion={motion}
        treeData={treeData}
        onExpand={onExpand}
        expandedKeys={expandedKeys}
        expandAction={"click"}
        loadData={loadData}
        onSelect={onSelect}
        allowDrop={(node) => {
          return !node.dropNode.isLeaf;
        }}
        onDrop={onDrop}
        onRightClick={({ node }) => {
          console.log(node);
          showMenu({
            items: node.isLeaf
              ? FileContextMenu({ node, treeData, setEditPos })
              : DirContextMenu({ node, treeData, setEditPos }),
          });
        }}
      ></Tree>
    </div>
  );
};

export default FileTree;
