import { CurrentFileAtom } from "../lib/state";
import {
  Excalidraw,
  Footer,
  WelcomeScreen,
  exportToBlob,
  loadFromBlob,
  getSceneVersion,
} from "@excalidraw/excalidraw";
import {
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types/types";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import OnceInputer from "./OnceInputer";
import path from "../lib/path";
import { debounce } from "../lib/utils";

function Whiteboard() {
  const [ sceneVersion, setSceneVersion ] = useState<number>(0);
  const [ initialData, setInitialData ] = useState<ExcalidrawInitialDataState>();
  const currentFile = useAtomValue(CurrentFileAtom);
  const [renameing, setRenameing] = useState<boolean>(false);

  useEffect(() => {
    currentFile?.readAsBinary().then((buffer) => {
      if(buffer.length === 0) return setInitialData({});
      const blob = new Blob([buffer], { type: "image/png" });
      loadFromBlob(blob, null, null).then((data) => {
        setInitialData(data);
        setSceneVersion(getSceneVersion(data.elements));
      }).catch(()=>{
        window.nole.notify.error({
          content: "File load failed! Is it a valid Excalidraw file?",
        });
      });
    });
  },[]);

  const autosave = useCallback(
    debounce(async (elements, appState, files) => {
      if (!currentFile) return;
      const blob = await exportToBlob({
        appState: {
          ...appState,
          exportEmbedScene: true,
          exportBackground: false,
          exportScale: 2,
        },
        elements,
        files,
        mimeType: "image/png",
      });
      const buffer = await blob.arrayBuffer();
      await currentFile.writeAsBinary(buffer);
    }, window.nole.config.autosave_delay),
    []
  );

  if (!initialData) return <div className="w-full h-full bg-slate-200 animate-pulse" />;
  return (
    <Excalidraw
      initialData={initialData}
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
      onChange={(elements, appState, files) => {
        const currentVersion = getSceneVersion(elements);
        if(currentVersion <= sceneVersion) return;
        setSceneVersion(currentVersion);
        autosave(elements, appState, files);
      }}
    >
      <WelcomeScreen>
        <WelcomeScreen.Hints.ToolbarHint />
        <WelcomeScreen.Hints.HelpHint />
        <WelcomeScreen.Hints.MenuHint />
        <WelcomeScreen.Center>
          <WelcomeScreen.Center.Heading>
            Nólë Whiteboard
          </WelcomeScreen.Center.Heading>
        </WelcomeScreen.Center>
      </WelcomeScreen>
      <Footer>
        {renameing ? (
          <OnceInputer
            className="w-full ml-2 h-10 select-text"
            filename={currentFile!.name}
            onRename={(newFilename) => {
              if (newFilename === currentFile!.name || newFilename === "") {
                setRenameing(false);
                return;
              }
              window.nole.fs
                .move(
                  currentFile!.path,
                  path.join(
                    currentFile!.parent,
                    newFilename + currentFile!.extname
                  )
                )
                .catch((e) => {
                  window.nole!.notify.error({ content: e as string });
                })
                .finally(() => setRenameing(false));
            }}
          />
        ) : (
          <div
            className="h-10 overflow-hidden w-full flex flex-row-reverse items-center font-bold text-lg"
            onDoubleClick={() => {
              setRenameing(true);
            }}
          >
            {"✏️ "+currentFile?.name}
          </div>
        )}
      </Footer>
    </Excalidraw>
  );
}

export default Whiteboard;
