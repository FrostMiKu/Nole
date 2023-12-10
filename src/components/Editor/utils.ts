import { NoleFile } from "../../lib/file";
import { debounce } from "../../lib/utils";
import { editor as editorType } from "monaco-editor";
import ICodeEditor = editorType.ICodeEditor;
import * as monaco from "monaco-editor";

export const autosave = (saveDelay: number) =>
  debounce((currentFile: NoleFile|null, editor: ICodeEditor | null) => {
    if (currentFile && editor) {
      const model = editor.getModel();
      if (!model) return;
      const content = model.getValue();
      currentFile.write(content);
    }
  }, saveDelay);

export const fetchContent = async (editor: ICodeEditor, file: NoleFile) => {
    if (!editor) return;

    // Prevent further updates and immediately flush pending updates
    editor.updateOptions({ readOnly: true });
    // handleSaveDebounce.flush();

    editor.getModel()?.dispose();

    try {
      const content = await file.read();
      const uri = monaco.Uri.file(file.path);

      let model = monaco.editor.getModel(uri);
      if (model) {
        // Update existing model. This should only be possible in development mode
        // after hot reload.
        model.setValue(content);
      } else {
        model = monaco.editor.createModel(content, undefined, uri);
      }
      editor.setModel(model);
    } finally {
      editor.updateOptions({ readOnly: false });
    }
};