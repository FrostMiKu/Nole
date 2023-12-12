import { Nole } from "./lib/nole";
import App from "./App";
import { open } from "@tauri-apps/api/dialog";
import { useAtom, useSetAtom } from "jotai";
import { AppInitializedAtom, CurrentFileAtom } from "./lib/state";
import { useCallback, useEffect } from "react";
import { AnchorButton } from "@blueprintjs/core";
import { throttle } from "./lib/utils";
import { exists } from "@tauri-apps/api/fs";
import { initMonaco } from "./lib/editor/monaco";

function Loading() {
  const [appInitialized, setAppInitialized] = useAtom(AppInitializedAtom);
  const setCurrenFile = useSetAtom(CurrentFileAtom);

  const onClick = useCallback(throttle(() => {
    open({
      multiple: false,
      directory: true,
    }).then((dirpath) => {
      if (dirpath === null) return;

      window.nole = new Nole(dirpath as string);
      initMonaco.then(() => {
        setCurrenFile(null);
        setAppInitialized(true);
      });
    });
  }, 1000),[])

  useEffect(() => {
    const path = localStorage.getItem("workspace");
    if (path) {
      exists(path).then((exist) => {
        if (!exist) {
          localStorage.removeItem("workspace");
          return;
        }else{
          new Nole(path);
          setAppInitialized(true);
        }
      });
    }
  }, []);

  return (
    <>
      {appInitialized ? (
        <App />
      ) : (
        <div className="w-full h-screen flex flex-col justify-center items-center text-2xl text-gray-400">
          <div> Please Select Workspace </div>
          <AnchorButton
          className="mt-4"
            text="Open"
            icon="folder-open"
            onClick={onClick}
          />
        </div>
      )}
    </>
  );
}

export default Loading;
