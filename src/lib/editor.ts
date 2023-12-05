import { history, defaultKeymap, indentWithTab } from "@codemirror/commands";
import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import {
  autocompletion,
  CompletionContext,
  type Completion,
} from "@codemirror/autocomplete";
import { debounce } from "../lib/utils";
import { autocomplete } from "../ipc/typst";
import { NoleFile } from "./file";

export const Theme = EditorView.theme({
  "&.cm-focused": { outline: "none" },
  "&": { height: "100%" },
  ".cm-scroller": { overflow: "auto" },
  ".cm-gutters": { borderRadius: "0.5rem 0 0 0.5rem" },
});

function processApply(apply: string) {
  let result = apply;
  const positions: { from: number; to: number }[] = [];

  // match ${...}
  const regex = /\${(.*?)}/g;
  let match = regex.exec(apply);

  while (match) {
    // fullMatch: ${...} innerMatch: ...
    const [fullMatch, innerMatch] = match;

    const startIndex = match.index - 3 * positions.length;
    const endIndex = startIndex + innerMatch.length;
    positions.push({
      from: startIndex,
      to: endIndex,
    });

    // replace ${...} with ...
    result = result.replace(fullMatch, innerMatch);

    // match next
    match = regex.exec(apply);
  }

  return { result, positions };
}

export function getTypingExtension(fn: (content: string) => void) {
  return EditorView.updateListener.of((v) => {
    if (v.docChanged) {
      const content = v.state.doc.toString();
      fn(content);
    }
  });
}

export const autosave = debounce((currentFile: NoleFile, content: string) => {
  if (currentFile) {
    // console.log("autosave", currentFile.path);
    // console.log("content", content);
    currentFile.write(content);
  }
}, window.nole!.config.autosave_delay);

export function getAutocompletionExtension(file: NoleFile) {
  // todo: add mutiparams selection, tab to select next
  async function Completions(context: CompletionContext) {
    let word = context.matchBefore(/['@','#','[','&','{','$'].*/);
    if (word === null) return null;
    if (word!.from === word!.to && !context.explicit) return null;

    const complete = await autocomplete(
      file.path,
      context.state.doc.toString(),
      word.to,
      context.explicit
    ).catch((e) => {
      console.log("autocomplete failed!", e);
      return null;
    });
    if (complete === null) return null;
    const options = complete.completions.map((item) => {
      if (typeof item.kind !== "string") {
        item.kind = item.kind.symbol;
      } else if (item.kind === "func") {
        item.kind = "function";
      } else if (item.kind === "syntax") {
        item.kind = "text";
      } else if (item.kind === "param") {
        item.kind = "variable";
      }
      const option = {
        label: item.label,
        type: item.kind,
        detail: item.detail,
        apply: (view: EditorView, _: Completion, from: number, to: number) => {
          if (!item.apply) {
            view.dispatch({
              changes: { from, to, insert: item.label },
            });
          } else {
            const apply = processApply(item.apply);
            view.dispatch({
              changes: { from, to, insert: apply.result },
            });
            apply.positions.forEach((pos) => {
              view.dispatch({
                selection: { anchor: from + pos.from, head: from + pos.to },
              });
            });
          }
        },
      } as Completion;

      return option;
    });

    return {
      from: complete.offset,
      options,
    };
  }
  return autocompletion({
    override: [Completions],
  });
}
export const basicExtensions = [
  basicSetup,
  Theme,
  history(),
  keymap.of([...defaultKeymap, indentWithTab]),
  EditorView.lineWrapping,
];
