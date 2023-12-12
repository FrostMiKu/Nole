import * as monaco from "monaco-editor";
import * as oniguruma from "vscode-oniguruma";
import onigurumaWasm from "vscode-oniguruma/release/onig.wasm?url";
import { Registry } from "vscode-textmate";

import { wireTextMateGrammars } from "./grammar";
import bibtex from "./lang/bibtex.json";
import typstConfig from "./lang/typst-config.json";
import typstTm from "./lang/typst-tm.json";
import theme from "./theme/theme.json";

import { TypstCompletionProvider } from "./completion";

type IMonarchLanguage = monaco.languages.IMonarchLanguage;

export const initMonaco = (async () => {
  // Don't use streaming due to MIME type mismatch.
  // See: https://github.com/tauri-apps/tauri/issues/5749
  // TODO: Switch to streaming once Tauri v2 is out
  const wasm = await fetch(onigurumaWasm).then((res) => res.arrayBuffer());
  await oniguruma.loadWASM(wasm);

  // Register TextMate grammars
  const registry = new Registry({
    onigLib: Promise.resolve(oniguruma),
    // @ts-ignore
    loadGrammar() {
      return Promise.resolve(typstTm);
    },
  });

  const grammars = new Map();
  grammars.set("typst", "source.typst");

  monaco.languages.register({ id: "typst", extensions: ["typ"] });
  monaco.languages.setLanguageConfiguration(
    "typst",
    typstConfig as unknown as monaco.languages.LanguageConfiguration
  );
  await wireTextMateGrammars(registry, { typst: "source.typst" });

  // Register Monarch languages
  monaco.languages.register({ id: "bibtex", extensions: ["bib"] });
  monaco.languages.setMonarchTokensProvider("bibtex", bibtex as IMonarchLanguage);

  // Register completion providers
  monaco.languages.registerCompletionItemProvider("typst", new TypstCompletionProvider());

  monaco.editor.defineTheme("dracula", theme as monaco.editor.IStandaloneThemeData);
  monaco.editor.setTheme("dracula");
  monaco.editor.remeasureFonts();
  console.log("Monaco initialized");
})();
