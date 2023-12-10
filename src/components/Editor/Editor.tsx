import Render from "./Render/Render";
import { CurrentFileAtom } from "../../lib/state";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { TypstCompileResult, exportPDF, reset } from "../../ipc/typst";
import { Button, Intent, Spinner } from "@blueprintjs/core";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import OnceInputer from "../OnceInputer";
import path from "../../lib/path";
import { save } from "@tauri-apps/api/dialog";
import Monaco from "./Monaco";

const Editor: React.FC = () => {
  const [currentFile, _] = useAtom(CurrentFileAtom);
  const [renameing, setRenameing] = useState<boolean>(false);
  const [doc, setDoc] = useState<TypstCompileResult | null>(null);
  const [debounceCancelFn, setDebounceCancelFn] = useState<(() => void) | null>(
    null
  );
  const [compileStatus, setCompileStatus] = useState<
    "idle" | "compiling" | "done" | "error"
  >("idle");

  // cancel last file compile debounce on file change
  useEffect(() => {
    reset();
    return () => {
      if (debounceCancelFn) {
        debounceCancelFn();
        setDebounceCancelFn(null);
      }
    };
  }, []);

  const exportButton = (
    <Button
      small
      icon="export"
      title="Export PDF"
      minimal
      onClick={async () => {
        if (currentFile === null) return Promise.reject();
        const exportPath = await save({
          defaultPath: currentFile.name + ".pdf",
          title: "Export PDF",
          filters: [
            {
              name: currentFile.name,
              extensions: ["pdf"],
            },
          ],
        });
        if (exportPath === null) return Promise.reject();
        exportPDF(currentFile.path, exportPath)
          .then(() =>
            window.nole.notify.info({
              content: "Exported at " + exportPath,
            })
          )
          .catch(() => {
            window.nole.notify.error({ content: "Failed to export." });
          });
      }}
    ></Button>
  );

  let status = (
    <>
      <span className="text-green-500">Cached</span>
      {exportButton}
    </>
  );
  if (compileStatus === "compiling") {
    status = (
      <Spinner
        className="inline-block"
        size={16}
        intent={Intent.PRIMARY}
      ></Spinner>
    );
  } else if (compileStatus === "done") {
    status = (
      <>
        <span className="text-green-500">Compiled</span>
        {exportButton}
      </>
    );
  } else if (compileStatus === "error") {
    status = <span className="text-red-500">Error</span>;
  }

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="bg-slate-50 shadow-sm hover:shadow-lg h-8 px-4 mt-2 mx-2 rounded-lg flex flex-row justify-between items-center">
        {renameing ? (
          <OnceInputer
            className="w-full mr-2 select-text"
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
          <h3
            className="w-full font-medium text-lg max-w-xs overflow-hidden"
            onDoubleClick={() => {
              setRenameing(true);
            }}
          >
            {"✍🏼 " + currentFile?.name}
          </h3>
        )}
        <div
          id="statusbar"
          className="h-full flex justify-center items-center gap-1"
        >
          {status}
        </div>
      </div>
      <PanelGroup
        autoSaveId="EditorSize"
        direction="horizontal"
        className="bg-white px-2 pb-2"
      >
        <Panel
          defaultSizePercentage={50}
          minSizePercentage={20}
          className="shadow-md hover:shadow-lg rounded-lg bg-black"
        >
          <Monaco
            className="w-full h-full select-text"
            file={currentFile}
            onCompile={setDoc}
            setState={setCompileStatus}
          />
        </Panel>
        <PanelResizeHandle className="w-1 hover:bg-sky-200 focus:outline-none" />
        <Panel defaultSizePercentage={50} minSizePercentage={20}>
          <Render doc={doc} />
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default Editor;
