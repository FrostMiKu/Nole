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
import { UIEvent } from "./lib/bus";
import Workspace from "./components/Workshop";

function App() {
  const fileTreeRef = useRef<ImperativePanelHandle | null>(null);

  useEffect(() => {
    const disposers: (() => void)[] = [];
    disposers.push(
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
          <Workspace />
        </Panel>
      </PanelGroup>

      <ToastContainer />
      {import.meta.env.DEV ? <DevEventListener /> : <></>}
    </div>
  );
}

export default App;
