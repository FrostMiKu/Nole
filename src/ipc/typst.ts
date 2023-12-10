import { invoke } from "@tauri-apps/api"

export type TypstDiagnosticSeverity = "error" | "warning";

export interface TypstDiagnostic {
  range: { start: number; end: number };
  severity: TypstDiagnosticSeverity;
  message: string;
  hints: string[];
}

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

export enum TypstCompletionKind {
    Syntax = 1,
    Function = 2,
    Parameter = 3,
    Constant = 4,
    Symbol = 5,
    Type = 6,
  }
  
  export interface TypstCompletion {
    kind: TypstCompletionKind;
    label: string;
    apply: string | null;
    detail: string | null;
  }
  export interface TypstCompleteResponse {
    offset: number;
    completions: TypstCompletion[];
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

export const autocomplete = async (content:string, offset:number, explicit:boolean):Promise<TypstCompleteResponse> => {
    return invoke("autocomplete", {"content": content, "offset": offset, "explicit":explicit});
}

export const exportPDF = async (id:string, path:string):Promise<void> => {
    return invoke("export", {"id": id, "path": path});
}