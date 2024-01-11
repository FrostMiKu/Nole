import { invoke } from "@tauri-apps/api";

/**
 * Paste image in the clipboard to path.
 * @param path 
 * @returns image path.
 */
export async function pasteImage(path:string) : Promise<string> {
    return invoke("paste_image", {"path": path});
}