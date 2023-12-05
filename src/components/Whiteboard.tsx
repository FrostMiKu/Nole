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
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { debounce } from "../lib/utils";

function Whiteboard() {
  const currentFile = useAtomValue(CurrentFileAtom);
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentFile || !excalidrawAPI) return;
    currentFile.read().then((content) => {
      if (content.length === 0) return;
      const dataState = JSON.parse(content);
      excalidrawAPI.updateScene(dataState);
      setLoading(false);
    });
    return () => {
      setLoading(true);
    };
  }, [currentFile, excalidrawAPI]);

  const autosave = useCallback(
    debounce((elements, appState, files) => {
      if (!currentFile || !excalidrawAPI || loading) return;
      // if (currentFile && excalidrawAPI) {
        // const elements = excalidrawAPI.getSceneElements();
        // const appState = excalidrawAPI.getAppState();
        // const files = excalidrawAPI.getFiles();
        currentFile.write(
          serializeAsJSON(elements, appState, files, "local")
        );
      // }
    }, window.nole.config.autosave_delay),
    [currentFile, excalidrawAPI, loading]
  );

  return (
    <Excalidraw
      UIOptions={{
        canvasActions: {
          loadScene: true,
          saveToActiveFile: true,
          saveAsImage: false,
          export: false,
          clearCanvas: true,
          toggleTheme: true,
        },
      }}
      excalidrawAPI={(api) => setExcalidrawAPI(api)}
      onChange={autosave}
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
          {loading?"Loading...":currentFile?.name}
        </div>
      </Footer>
    </Excalidraw>
  );
}

export default Whiteboard;
