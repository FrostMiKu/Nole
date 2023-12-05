import { CurrentFileAtom } from "../lib/state";
import {
  Excalidraw,
  Footer,
  WelcomeScreen,
  exportToBlob,
  loadFromBlob,
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
      const saver = currentFile.clone();
      exportToBlob({appState:{
        ...appState,
        exportEmbedScene: true,
      }, elements, files, mimeType: "image/png",}).then((blob) => {
         blob.arrayBuffer().then((buffer) => {
            saver.writeAsBinary(buffer);
         });
      });    
    });
    currentFile.readAsBinary().then((buffer) => {
      if (buffer.length === 0) return;
      const blob = new Blob([buffer], {type: "image/png"});
      loadFromBlob(blob, null, null).then((data) => {
        excalidrawAPI.updateScene(data);
      }).catch((_) => {
        window.nole.notify.error({content: "File load failed! Is it a valid Excalidraw file?"});
        setCurrenFile(null);
      });
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
