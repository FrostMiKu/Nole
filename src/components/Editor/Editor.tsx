import CodeMirror from "./CodeMirror";
import Render from "./Render/Render";
import {
  basicExtensions,
  getAutocompletionExtension,
  getTypingExtension,
  autosave,
} from "../../lib/editor";
import { CurrentFileAtom } from "../../lib/state";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { EditorView } from "codemirror";
import { EditorState } from "@codemirror/state";
import { debounce, asyncThrottle } from "../../lib/utils";
import { TypstCompileResult, compile, exportPDF, reset } from "../../ipc/typst";
import { Button, Intent, Spinner, Tooltip } from "@blueprintjs/core";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import OnceInputer from "../OnceInputer";
import path from "path-browserify";
import { save } from "@tauri-apps/api/dialog";

export const Editor = () => {
  const [currentFile, _] = useAtom(CurrentFileAtom);
  const [renameing, setRenameing] = useState<boolean>(false);
  const [editor, setEditor] = useState<EditorView | null>(null);
  const [doc, setDoc] = useState<TypstCompileResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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

  useEffect(() => {
    const autoSave = autosave(window.nole.config.autosave_delay);
    const compileThrottled = asyncThrottle(
      async (path: string, content: string): Promise<void> => {
        try {
          setCompileStatus("compiling");
          const document = await compile(
            window.nole!.workspace()!,
            path,
            content
          );
          if (document.updated_idx.length === 0 && doc) {
            setCompileStatus("idle");
            setErrorMsg(null);
            return Promise.resolve();
          }
          setDoc(document);
        } catch (error) {
          setErrorMsg(error as string);
          // window.nole!.notify.error({ content: error as string });
          setCompileStatus("error");
          return Promise.reject(error);
        }
        setCompileStatus("done");
        setErrorMsg(null);
        return Promise.resolve();
      }
    );
    // throttle compile, debounce typing
    const compileDebounced = debounce(
      compileThrottled,
      window.nole!.config.compile_delay
    );

    setCompileStatus("idle");
    if (currentFile !== null) {
      const typingExtension = getTypingExtension((content) => {
        autoSave(currentFile, content);
        const cancelFN = compileDebounced(currentFile.path, content);
        setDebounceCancelFn(() => cancelFN);
      });
      const autocompletionExtension = getAutocompletionExtension(currentFile);
      currentFile
        .read()
        .then((e) => {
          editor?.setState(
            EditorState.create({
              doc: e,
              extensions: [
                ...basicExtensions,
                autocompletionExtension,
                typingExtension,
              ],
            })
          );
          // compile on open
          compileThrottled(currentFile.path, e);
        })
        .catch((e) => {
          window.nole!.notify.error({ content: e as string });
        });
    }
  }, [editor]);

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
    status = (
      <span className="text-red-500">
        {errorMsg ? (
          <Tooltip defaultIsOpen={true} position="bottom" content={errorMsg}>
            <>
              <span className="inline-flex relative h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
              </span>
              Error
            </>
          </Tooltip>
        ) : (
          "Error"
        )}
      </span>
    );
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
          className="shadow-md hover:shadow-lg rounded-lg"
        >
          <CodeMirror
            state={EditorState.create({ extensions: basicExtensions })}
            setEditor={setEditor}
            className="h-full select-text"
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
