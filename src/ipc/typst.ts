import { invoke } from "@tauri-apps/api"
// import type { Completion } from "@codemirror/autocomplete";

export const clearCache = (): Promise<void> => {
    return invoke("clear_cache", {});
}

export interface TypstDocument {
    n_pages: number,
    frames: [number,string][],
    width: number,
    height: number,
}

export const compile = (workspace:string, path:string, content:string): Promise<TypstDocument> => {    
    return invoke("compile", {"workspace": workspace, "path": path, "content": content});
}

// export interface TypstCompileResult {

// }

interface Completion {
    label: string;
    kind: string|{symbol:string};
    apply?: string;
    detail?: string;
}

interface CompletionResult {
    completions: Completion[];
    offset: number;
}

export const autocomplete = (path:string, content:string, offset:number, explicit:boolean):Promise<CompletionResult> => {
    return invoke("autocomplete", {"path": path, "content": content, "offset": offset, "explicit":explicit});
}