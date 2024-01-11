import { useCallback, useEffect, useRef, useState } from "react";
// import { initMonaco } from "../../lib/editor/monaco";
import { editor as editorType } from "monaco-editor";
import IStandaloneCodeEditor = editorType.IStandaloneCodeEditor;
import IMarkerData = editorType.IMarkerData;
import { fetchContent, autosave } from "./utils";
import { NoleFile } from "../../lib/file";
import { asyncThrottle, debounce } from "../../lib/utils";
import { TypstCompileResult, TypstDiagnostic, compile } from "../../ipc/typst";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { listen } from "@tauri-apps/api/event";
import { compileStatus } from "./Editor";
import path from "../../lib/path";

interface MonacoProps {
  file: NoleFile | null;
  onCompiled?: (doc: TypstCompileResult | null) => void;
  onStateChanged?: (state: compileStatus) => void;
}

self.MonacoEnvironment = {
  getWorker: function (_moduleId: any, _: string) {
    return new EditorWorker();
  },
};

const Monaco: React.FC<MonacoProps> = ({
  file,
  onCompiled,
  onStateChanged,
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  // const [editor, setEditor] = useState<ICodeEditor | null>(null);
  const editorRef = useRef<IStandaloneCodeEditor | null>(null);
  const [debounceCancelFn, setDebounceCancelFn] = useState<(() => void) | null>(
    null
  );

  const compileThrottled = useCallback(
    asyncThrottle(async (init: boolean = false) => {
      if (!editorRef.current || !file) return;
      const model = editorRef.current.getModel();
      if (!model) return;
      onStateChanged?.(compileStatus.compiling);
      console.log("compiling!");
      const document = await compile(
        window.nole.workspace(),
        file.path,
        model.getValue(),
        init
      ).catch((error) => {
        console.debug(error);
        onStateChanged?.(compileStatus.error);
      });

      if (!document) return;
      if (document.updated_idx.length === 0) {
        onStateChanged?.(compileStatus.idle);
      } else {
        onCompiled?.(document);
        onStateChanged?.(compileStatus.done);
      }
      // remove all markers
      monaco.editor.setModelMarkers(model, "owner", []);
    }),
    []
  );

  const compileHandler = useCallback(
    debounce(compileThrottled, window.nole.config.compile_delay),
    [compileThrottled]
  );

  const autosaveHandler = useCallback(
    autosave(window.nole.config.autosave_delay),
    []
  );

  const pasteHandler = useCallback(async (event: ClipboardEvent) => {
    if (!file || !editorRef.current) return;
    const text = event.clipboardData?.getData("text");
    const range = editorRef.current.getSelection();
    const model = editorRef.current.getModel();

    if (text === "" || !text ) {
      const res = await window.nole.fs.pasteImage(
        path.join(file!.parent, "images")
      );
      window.nole.notify.info({
        content: `Pasted image at ${res}`,
      });
      if (range && model) {
        model.pushEditOperations(
          [],
          [
            {
              range: range,
              text: `\n#figure(\n  image("${res}"),\n  caption: []\n)\n`,
            },
          ],
          () => null
        );
      }
    }
  }, []);

  useEffect(() => {
    if (!divRef.current || editorRef.current) return;
    let disposer: Promise<() => void>;
    const timer = setTimeout(() => {
      editorRef.current = monaco.editor.create(divRef.current!, {
        accessibilitySupport: "off",
        lineHeight: 1.8,
        automaticLayout: true,
        readOnly: true,
        folding: true,
        quickSuggestions: false,
        wordWrap: "on",
        minimap: {
          enabled: true,
        },
        unicodeHighlight: { ambiguousCharacters: false },
      });
      disposer = listen<TypstDiagnostic[]>(
        "typst::compile",
        ({ payload: diagnostics }) => {
          if (!editorRef.current) return;
          const model = editorRef.current.getModel();
          if (model) {
            const markers: IMarkerData[] =
              diagnostics?.map(({ range, severity, message, hints }) => {
                const start = model.getPositionAt(range.start);
                const end = model.getPositionAt(range.end);
                return {
                  startLineNumber: start.lineNumber,
                  startColumn: start.column,
                  endLineNumber: end.lineNumber,
                  endColumn: end.column,
                  message:
                    message +
                    "\n" +
                    hints.map((hint) => `hint: ${hint}`).join("\n"),
                  severity:
                    severity === "error"
                      ? monaco.MarkerSeverity.Error
                      : monaco.MarkerSeverity.Warning,
                };
              }) ?? [];
            monaco.editor.setModelMarkers(model, "owner", markers);
          }
        }
      );
      // editorRef.current.onDidCompositionEnd(() => { }); // TODO: handle IME
      editorRef.current.onDidChangeModelContent(() => {
        setDebounceCancelFn(() => compileHandler());
        autosaveHandler(file, editorRef.current);
      });
      fetchContent(editorRef.current, file!).then(() => {
        // initial compile
        onStateChanged?.(compileStatus.compiling);
        compileThrottled(true);
      });
      editorRef.current.addCommand(
        monaco.KeyMod.Alt | monaco.KeyCode.Enter,
        () => {
          editorRef.current!.getAction("editor.action.triggerSuggest")!.run();
        }
      );
    }, 0); // for strict mode
    return () => {
      editorRef.current?.getModel()?.dispose();
      editorRef.current ? editorRef.current.dispose() : clearTimeout(timer);
      disposer?.then((dispose) => dispose());
      debounceCancelFn?.();
    };
  }, []);

  return <div className="w-full h-full select-text" onPasteCapture={e=>pasteHandler(e.nativeEvent)} ref={divRef}></div>;
};

export default Monaco;
