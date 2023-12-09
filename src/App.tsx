import FileTree from "./components/FileTree/FileTree";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Editor } from "./components/Editor/Editor";
import { CurrentFileAtom } from "./lib/state";
import { useAtom } from "jotai";
import Ribbon from "./components/Ribbon";
import { useEffect, useRef } from "react";
import DevEventListener from "./DevEventListener";
import Whiteboard from "./components/Whiteboard";
import PictureViewer from "./components/PictureViewer";
import {
  ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { UIEvent } from "./lib/bus";

function App() {
  const [currentFile, setCurrenFile] = useAtom(CurrentFileAtom);
  const fileTreeRef = useRef<ImperativePanelHandle | null>(null);

  useEffect(() => {
    const disposers: (() => void)[] = [];
    disposers.push(
      window.nole!.fs.onFileOpen((file) => {
        setCurrenFile(file);
      }),
      window.nole.bus.on(UIEvent.ToggleFileTree, () => {
        if (fileTreeRef.current?.isCollapsed()) {
          fileTreeRef.current?.expand();
        } else {
          fileTreeRef.current?.collapse();
        }
      })
    );
    return () => {
      disposers.forEach((disposer) => disposer());
    };
  }, []);

  useEffect(() => {
    const disposers: (() => void)[] = [];
    disposers.push(
      window.nole!.fs.onFileDeleted((filepath) => {
        if (currentFile?.path === filepath) {
          setCurrenFile(null);
        }
      }),
      window.nole!.fs.onDirDeleted((dirpath) => {
        if (currentFile?.path.startsWith(dirpath)) {
          setCurrenFile(null);
        }
      }),
      window.nole!.fs.onMoved((oldpath, newpath) => {
        console.log("moved", oldpath, newpath, currentFile?.path);
        if (currentFile?.path === oldpath) {
          console.log("reopen");
          window.nole!.fs.openFile(newpath);
        }
      })
    );
    return () => {
      disposers.forEach((disposer) => disposer());
    };
  }, [currentFile]);

  let workspace = (
    <div className="w-full h-full flex justify-center items-center text-2xl text-gray-400">
      No file selected
    </div>
  );

  switch (currentFile?.extname) {
    case ".typ":
      workspace = <Editor key={currentFile.path} />; // key: force rerender for different files
      break;
    case ".draw":
      workspace = <Whiteboard key={currentFile.path} />;
      break;
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".bmp":
    case ".gif":
    case ".webp":
    case ".svg":
      workspace = <PictureViewer />;
      break;
    default:
      if (currentFile) {
        workspace = (
          <div className="w-full h-full flex justify-center items-center text-2xl text-red-400">
            Unknow file type
          </div>
        );
      }
      break;
  }

  return (
    <div className="flex flex-row w-full h-screen select-none overflow-hidden">
      <Ribbon />
      <PanelGroup
        autoSaveId="FileTreeSize"
        direction="horizontal"
        className="h-full w-full"
      >
        <Panel
          defaultSizePercentage={15}
          minSizePercentage={10}
          maxSizePercentage={25}
          collapsible
          className="w-full h-full"
          ref={fileTreeRef}
        >
          <FileTree />
        </Panel>
        <PanelResizeHandle className="w-px bg-gray-200 focus:outline-none hover:bg-sky-200" />
        <Panel className="w-full h-full">
          <div id="workspace" className="w-full h-full">
            {workspace}
          </div>
        </Panel>
      </PanelGroup>

      <ToastContainer />
      {import.meta.env.DEV ? <DevEventListener /> : <></>}
    </div>
  );
}

export default App;
