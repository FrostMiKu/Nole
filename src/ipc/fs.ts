import { invoke } from "@tauri-apps/api";

export async function deleteToTrash(path:string) {
    return invoke("delete", {"path": path});
}