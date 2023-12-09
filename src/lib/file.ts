import { fs } from "@tauri-apps/api";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { FileEntry } from "@tauri-apps/api/fs";
import { EventBus, FileEvent } from "./bus";
import { open } from "@tauri-apps/api/shell";
import { deleteToTrash, getAvailablePath } from "../ipc/fs";
import path from "./path";

type BinaryFileContents = Iterable<number> | ArrayLike<number> | ArrayBuffer;

class File {
  // nole directory path
  private bus: EventBus;
  path: string;
  filename: string;
  name: string;
  parent: string;
  extname: string; // no extname will be set ""
  cache?: string | BinaryFileContents;

  constructor(bus: EventBus, filepath: string) {
    this.bus = bus;
    this.path = filepath;
    const p = path.parse(filepath);
    this.filename = p.base;
    this.name = p.name;
    this.extname = p.ext;
    this.parent = p.dir;
    this.cache = undefined;
  }

  /**
   * Clone a file object without cache,
   * it's useful when you want to write a file in the promise.
   * clone is cheap, it just copy the file path.
   */
  clone(): File {
    return new File(this.bus, this.path);
  }

  async read(): Promise<string> {
    if (!(this.cache instanceof String)) {
      try {
        this.cache = await fs.readTextFile(this.path);
      } catch (error) {
        Promise.reject(error);
      }
    }
    this.bus.emit(FileEvent.FileRead, this.cache);
    return Promise.resolve(this.cache as string);
  }

  async readAsBinary(): Promise<Uint8Array> {
    if (!(this.cache instanceof Uint8Array)) {
      try {
        this.cache = await fs.readBinaryFile(this.path);
      } catch (error) {
        Promise.reject(error);
      }
    }
    this.bus.emit(FileEvent.FileReadBinary, this.cache);
    return Promise.resolve(this.cache as Uint8Array);
  }

  async write(content: string): Promise<void> {
    await fs.writeTextFile(this.path, content);
    this.bus.emit(FileEvent.FileWritten, this.path, content);
    this.cache = content;
  }

  async writeAsBinary(content: BinaryFileContents): Promise<void> {
    await fs.writeBinaryFile(this.path, content);
    this.bus.emit(FileEvent.FileWrittenBinary, this.path, content);
    this.cache = content;
  }

  /**
   * Convert a device file path to an URL
   * @returns a url that can be loaded by the webview
   */
  convertFileSrc(): string {
    return convertFileSrc(this.path);
  }
}

export type NoleFile = File;

export class FileManager {
  root: string;
  private bus: EventBus;

  constructor(root: string, bus: EventBus) {
    this.root = root;
    this.bus = bus;
  }

  async openFile(filepath: string): Promise<File> {
    filepath = await this.withinRoot(filepath)!;
    if (!filepath) {
      return Promise.reject("Invalid path.");
    }
    if (await fs.exists(filepath)) {
      const file = new File(this.bus, filepath);
      this.bus.emit(FileEvent.FileOpened, file);
      return file;
    }
    return Promise.reject("File not exists.");
  }
  onFileOpened(listener: (file: File) => void) {
    return this.bus.on(FileEvent.FileOpened, listener);
  }
  async listDir(
    dirpath: string,
    recursive: boolean = false
  ): Promise<FileEntry[]> {
    dirpath = await this.withinRoot(dirpath);
    return await fs.readDir(dirpath, { recursive });
  }
  async createDir(dirpath: string, recursive: boolean = false): Promise<void> {
    dirpath = await this.withinRoot(dirpath);
    if (await fs.exists(dirpath)) {
      return Promise.reject("Dir already exists.");
    }
    await fs.createDir(dirpath, { recursive });
    this.bus.emit(FileEvent.NewDirCreated, dirpath);
  }
  onDirCreated(listener: (dirpath: string) => void) {
    return this.bus.on(FileEvent.NewDirCreated, listener);
  }
  // create file, if file exists, return error
  async createFile(filepath: string): Promise<File> {
    filepath = await this.withinRoot(filepath);
    if (await fs.exists(filepath)) {
      return Promise.reject("File exists.");
    }
    const file = new File(this.bus, filepath);
    await file.write("");
    this.bus.emit(FileEvent.NewFileCreated, file);
    return file;
  }
  onFileCreated(listener: (file: File) => void) {
    return this.bus.on(FileEvent.NewFileCreated, listener);
  }
  // try create file, if file exists, add a number to the filename, until success
  async tryCreateFile(filepath: string): Promise<File> {
    filepath = await this.getAvailablePath(filepath);
    return this.createFile(filepath);
  }
  // can not recursive create dir
  async tryCreateDir(dirpath: string): Promise<void> {
    dirpath = await this.getAvailablePath(dirpath);
    return this.createDir(dirpath);
  }
  async deleteFile(filepath: string, trash: boolean = true): Promise<void> {
    filepath = await this.withinRoot(filepath);
    if (trash) {
      await deleteToTrash(filepath);
    } else {
      await fs.removeFile(filepath);
    }
    this.bus.emit(FileEvent.FileDeleted, filepath);
  }
  onFileDeleted(listener: (filepath: string) => void) {
    return this.bus.on(FileEvent.FileDeleted, listener);
  }
  async delectDir(
    dirpath: string,
    recursive: boolean = false,
    trash: boolean = true
  ): Promise<void> {
    dirpath = await this.withinRoot(dirpath);
    if (trash) {
      await deleteToTrash(dirpath);
    } else {
      await fs.removeDir(dirpath, { recursive });
    }
    this.bus.emit(FileEvent.DirDeleted, dirpath);
  }
  onDirDeleted(listener: (dirpath: string) => void) {
    return this.bus.on(FileEvent.DirDeleted, listener);
  }
  async move(
    oldpath: string,
    newpath: string,
    overwrite: boolean = false
  ): Promise<void> {
    oldpath = await this.withinRoot(oldpath);
    newpath = await this.withinRoot(newpath);
    if (oldpath === newpath) {
      return Promise.reject("Same path.");
    }
    if ((await fs.exists(newpath)) && !overwrite) {
      return Promise.reject("File already exists.");
    }
    await fs.renameFile(oldpath, newpath);
    this.bus.emit(FileEvent.FileMoved, oldpath, newpath);
    return Promise.resolve();
  }
  onMoved(listener: (oldpath: string, newpath: string) => void) {
    return this.bus.on(FileEvent.FileMoved, listener);
  }

  openExplorer(dirpath: string): Promise<void> {
    return open(dirpath);
  }

  // Resolve the filepath within the workspace root or reject.
  private async withinRoot(filepath: string): Promise<string> {
    filepath = await path.resolve(this.root, filepath);
    if (filepath.startsWith(this.root)) {
      return filepath;
    } else {
      return Promise.reject("Invalid path.");
    }
  }

  // try find a path of a unused filename, if file exists, add a number to the filename, until success
  private async getAvailablePath(trypath: string): Promise<string> {
    trypath = await this.withinRoot(trypath)!;
    return getAvailablePath(trypath);
  }
}
