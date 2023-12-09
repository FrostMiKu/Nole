import { invoke } from "@tauri-apps/api";

export async function deleteToTrash(path:string) {
    return invoke("delete", {"path": path});
}

/**
 * Get a path for create file or dir. If the path exists, the path will be appended with a number.
 * @param path 
 * @returns A path that does not exist.
 */
export async function getAvailablePath(path:string) : Promise<string> {
    return invoke("get_available_path", {"path": path});
}