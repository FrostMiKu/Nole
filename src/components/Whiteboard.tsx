import { CurrentFileAtom } from "../lib/state";
import {
  Excalidraw,
  Footer,
  WelcomeScreen,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import {
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types/types";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";

function Whiteboard() {
  const [currentFile, setCurrenFile] = useAtom(CurrentFileAtom);
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    if (!currentFile || !excalidrawAPI) return;
    const disposer = excalidrawAPI.onPointerUp(()=>{
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();
      currentFile.write(
        serializeAsJSON(elements, appState, files, "local")
      );      
    });
    currentFile.read().then((content) => {
      try{
        const dataState = JSON.parse(content);
        if (dataState.type !== "excalidraw") {
          throw new Error("Not a valid Excalidraw file");
        }
        excalidrawAPI.updateScene(dataState);
      } catch (e) {
        window.nole.notify.error({content: "File load failed! Is it a valid Excalidraw file?"});
        setCurrenFile(null);
      }
    });
    return () => {
      disposer();
    };
  }, [currentFile, excalidrawAPI]);

  return (
    <Excalidraw
      UIOptions={{
        canvasActions: {
          loadScene: false,
          saveToActiveFile: false,
          saveAsImage: false,
          export: false,
          clearCanvas: true,
          toggleTheme: true,
        },
      }}
      excalidrawAPI={(api) => setExcalidrawAPI(api)}
    >
      <WelcomeScreen>
        <WelcomeScreen.Hints.ToolbarHint />
        <WelcomeScreen.Hints.HelpHint />
        <WelcomeScreen.Hints.MenuHint />
        <WelcomeScreen.Center>
          <WelcomeScreen.Center.Logo />
          <WelcomeScreen.Center.Heading>
            Nólë Whiteboard
          </WelcomeScreen.Center.Heading>
        </WelcomeScreen.Center>
      </WelcomeScreen>
      <Footer>
        <div className="p-1 mx-2 w-full flex flex-row-reverse font-bold text-lg">
          {currentFile?.name}
        </div>
      </Footer>
    </Excalidraw>
  );
}

export default Whiteboard;
