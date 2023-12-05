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
import { useCallback, useEffect, useState } from "react";
import { EditorView } from "codemirror";
import { EditorState } from "@codemirror/state";
import { debounce, throttle } from "../../lib/utils";
import { TypstDocument, compile } from "../../ipc/typst";
import { Intent, Spinner } from "@blueprintjs/core";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export const Editor = () => {
  const [currentFile, _] = useAtom(CurrentFileAtom);
  const [editor, setEditor] = useState<EditorView | null>(null);
  const [doc, setDoc] = useState<TypstDocument | null>(null);
  const [compileStatus, setCompileStatus] = useState<
    "idle" | "compiling" | "done" | "error"
  >("idle");

  const compileDebounced = useCallback(
    // throttle compile, debounce typing, convert to canvas
    debounce(
      throttle(async (path: string, content: string): Promise<void> => {
        try {
          setCompileStatus("compiling");
          const document = await compile(window.nole!.workspace()!, path, content);
          if (document.frames.length === 0) {
            setCompileStatus("idle");
            return Promise.resolve();
          }
          setDoc(document);
        } catch (error) {
          window.nole!.notify.error({ content: error as string });
          setCompileStatus("error");
          return Promise.reject(error);
        }
        setCompileStatus("done");
        return Promise.resolve();
      }),
      window.nole!.config.compile_delay
    ),
    []
  );

  useEffect(() => {
    setCompileStatus("idle");
    if (currentFile !== null) {
      const typingExtension = getTypingExtension((content) => {
        autosave(currentFile, content);
        compileDebounced(currentFile.path, content);
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
          compileDebounced(currentFile.path, e);
        })
        .catch((e) => {
          window.nole!.notify.error({ content: e as string });
        });
    }
  }, [currentFile, editor]);

  let status = <></>;
  if (compileStatus === "compiling") {
    status = (
      <Spinner
        className="inline-block"
        size={16}
        intent={Intent.PRIMARY}
      ></Spinner>
    );
  } else if (compileStatus === "done") {
    status = <span className="text-green-500">Compiled</span>;
  } else if (compileStatus === "error") {
    status = <span className="text-red-500">Error</span>;
  }

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="bg-slate-50 shadow-sm hover:shadow-lg h-8 px-4 mt-2 mx-2 rounded-lg flex flex-row justify-between items-center">
        <h3 className="font-medium text-lg max-w-xs overflow-hidden">
          {currentFile?.name}
        </h3>
        {status}
      </div>
      <PanelGroup direction="horizontal" className="bg-white px-2 pb-2">
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
        <PanelResizeHandle className="w-1 hover:bg-blue-100 focus:outline-none" />
        <Panel defaultSizePercentage={50} minSizePercentage={20}>
          <Render doc={doc} />
        </Panel>
      </PanelGroup>
    </div>
  );
};
