import React, { useRef, useEffect } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";

interface CodeMirrorProps {
  state: EditorState;
  setEditor: React.Dispatch<React.SetStateAction<EditorView | null>>;
  className?: string;
}

const CodeMirror: React.FC<CodeMirrorProps> = ({state, setEditor, className}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let view: EditorView | null = null;
    if (editorRef.current) {      
        view = new EditorView({
          state,
          parent: editorRef.current as Element,
        });
        setEditor(view);
    }
    return () => {
        if (view){
          view.destroy();
        }
    };
  }, []);
  return <div className={className} ref={editorRef} />;
};

export default CodeMirror;
