import FileTree from "./components/FileTree/FileTree";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Ribbon from "./components/Ribbon";
import { useEffect, useRef } from "react";
import DevEventListener from "./DevEventListener";
import {
  ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import Workspace from "./components/Workspace";
import { useToggleFileTree } from "./components/FileTree/utils";



function App() {
  const fileTreeRef = useRef<ImperativePanelHandle | null>(null);
  const willCollapse = useToggleFileTree();

  useEffect(() => {
    if (willCollapse) {
      fileTreeRef.current?.collapse();
    } else {
      fileTreeRef.current?.expand();
    }
  }, [willCollapse]);

  return (
    <div className="flex flex-row w-full h-screen select-none overflow-hidden">
      <Ribbon />
      <PanelGroup
        autoSaveId="FileTreeSize"
        direction="horizontal"
        className="h-full w-full"
      >
        <Panel
          defaultSizePixels={200}
          minSizePixels={100}
          maxSizePixels={300}
          collapsible
          className="w-full h-full"
          ref={fileTreeRef}
        >
          <FileTree />
        </Panel>
        <PanelResizeHandle className="w-0.5 focus:outline-none hover:bg-sky-200" />
        <Panel className="w-full h-full">
          <Workspace />
        </Panel>
      </PanelGroup>

      <ToastContainer />
      {import.meta.env.DEV ? <DevEventListener /> : <></>}
    </div>
  );
}

export default App;
