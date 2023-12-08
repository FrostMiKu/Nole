import { invoke } from "@tauri-apps/api"

export interface TypstRenderResult {
    frame: string,
    width: number,
    height: number,
}

export interface TypstCompileResult {
    updated_idx: number[],
    n_pages: number,
    width: number,
    height: number,
}

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

export const reset = async (): Promise<void> => {
    return invoke("reset", {});
}

export const compile = async (workspace:string, path:string, content:string): Promise<TypstCompileResult> => {    
    return invoke("compile", {"workspace": workspace, "path": path, "content": content});
}

export const render = async (page:number, scale:number): Promise<TypstRenderResult> => {
    return invoke("render", {"page": page, "scale": scale});
}

export const autocomplete = async (path:string, content:string, offset:number, explicit:boolean):Promise<CompletionResult> => {
    return invoke("autocomplete", {"path": path, "content": content, "offset": offset, "explicit":explicit});
}

export const exportPDF = async (id:string, path:string):Promise<void> => {
    return invoke("export", {"id": id, "path": path});
}