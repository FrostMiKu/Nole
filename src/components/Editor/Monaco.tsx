import { useEffect, useRef, useState } from "react";
import { initMonaco } from "../../lib/editor/monaco";
import { editor as editorType } from "monaco-editor";
import ICodeEditor = editorType.ICodeEditor;
import IMarkerData = editorType.IMarkerData;
import { fetchContent, autosave } from "./utils";
import { NoleFile } from "../../lib/file";
import { asyncThrottle, debounce } from "../../lib/utils";
import { TypstCompileResult, TypstDiagnostic, compile } from "../../ipc/typst";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { listen } from "@tauri-apps/api/event";
import { reset } from "../../ipc/typst";


interface MonacoProps {
  file: NoleFile | null;
  className?: string;
  onCompile?: (doc: TypstCompileResult | null) => void;
  setState?: React.Dispatch<React.SetStateAction<"error" | "idle" | "compiling" | "done">>
}

self.MonacoEnvironment = {
  getWorker: function (_moduleId: any, _: string) {
    return new EditorWorker();
  },
};

const Monaco: React.FC<MonacoProps> = ({ file, className, onCompile, setState }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<ICodeEditor | null>(null);
  const [debounceCancelFn, setDebounceCancelFn] = useState<(() => void) | null>(
    null
  );

  useEffect(() => {
    if (!editor || !file) return;
    const disposer = listen<TypstDiagnostic[]>("typst::compile", ({ payload:diagnostics }) => {        
        if (!editor) return;
        const model = editor.getModel();
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
                message: message + "\n" + hints.map((hint) => `hint: ${hint}`).join("\n"),
                severity:
                  severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
              };
            }) ?? [];
  
          monaco.editor.setModelMarkers(model, "owner", markers);
        }
    });
    const compileThrottled = asyncThrottle(async () => {
        if (!editor || !file) return;
        const model = editor.getModel();
        if (!model) return;
        const document = await compile(
          window.nole.workspace(),
          file.path,
          model.getValue()
        ).catch((error) => {
            console.debug(error);
            setState?.("error");
        });
        if (!document) return;
        if (document.updated_idx.length === 0) {
          setState?.("idle");
        } else {
            onCompile?.(document);
            setState?.("done");
        }
        // remove all markers
        monaco.editor.setModelMarkers(model, "owner", []);
      });
      const compileHandler = debounce(
        compileThrottled,
        window.nole.config.compile_delay
      );
      const autosaveHandler = autosave(window.nole.config.autosave_delay);
      editor.onDidChangeModelContent(() => {
        setState?.("compiling");
        setDebounceCancelFn(()=>compileHandler());
        autosaveHandler(file, editor);
      });
      // initial compile
      setState?.("compiling");
      compileThrottled();
    return () => {
        disposer.then((dispose) => dispose());
    };
  }, [editor]);

  useEffect(() => {
    if (!divRef) return;
    initMonaco.then(async () => {
      // reset typst cache
      reset();
      setEditor((editor) => {
        if (editor) return editor;
        const newEditor = monaco.editor.create(divRef.current!, {
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
        fetchContent(newEditor, file!);
        return newEditor;
      });
    });
    return () => {
      editor?.dispose();
      debounceCancelFn?.();
    };
  }, [divRef]);

  return <div className={className} ref={divRef}></div>;
};

export default Monaco;
