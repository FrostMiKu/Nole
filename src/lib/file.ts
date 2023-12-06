import { fs } from "@tauri-apps/api";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { FileEntry } from "@tauri-apps/api/fs";
import { EventBus, FileEvent } from "./bus";
import path from "path-browserify";

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
    this.root = path.resolve(root);
    this.bus = bus;
  }

  async openFile(filepath: string): Promise<File> {
    filepath = this.withinRoot(filepath)!;
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
  onFileOpen(listener: (file: File) => void) {
    return this.bus.on(FileEvent.FileOpened, listener);
  }
  async listDir(
    dirpath: string,
    recursive: boolean = false
  ): Promise<FileEntry[]> {
    dirpath = this.withinRoot(dirpath)!;
    if (!dirpath) {
      return Promise.reject("Invalid path.");
    }
    return await fs.readDir(dirpath, { recursive });
  }
  async createDir(dirpath: string, recursive: boolean = false): Promise<void> {
    dirpath = this.withinRoot(dirpath)!;
    if (!dirpath) {
      return Promise.reject("Invalid path.");
    }
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
    filepath = this.withinRoot(filepath)!;
    if (!filepath) {
      return Promise.reject("Invalid path.");
    }
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
    filepath = await this.tryCreatePath(filepath);
    return this.createFile(filepath);
  }
  // can not recursive create dir
  async tryCreateDir(dirpath: string): Promise<void> {
    dirpath = await this.tryCreatePath(dirpath);
    return this.createDir(dirpath);
  }
  async deleteFile(filepath: string): Promise<void> {
    filepath = this.withinRoot(filepath)!;
    if (!filepath) {
      return Promise.reject("Invalid path.");
    }
    await fs.removeFile(filepath);
    this.bus.emit(FileEvent.FileDeleted, filepath);
  }
  onFileDeleted(listener: (filepath: string) => void) {
    return this.bus.on(FileEvent.FileDeleted, listener);
  }
  async delectDir(dirpath: string, recursive: boolean = false): Promise<void> {
    dirpath = this.withinRoot(dirpath)!;
    if (!dirpath) {
      return Promise.reject("Invalid path.");
    }
    await fs.removeDir(dirpath, { recursive });
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
    oldpath = this.withinRoot(oldpath)!;
    newpath = this.withinRoot(newpath)!;
    if (oldpath === newpath) {
      return Promise.reject("Same path.");
    }
    if (oldpath && newpath) {
      if ((await fs.exists(newpath)) && !overwrite) {
        return Promise.reject("File already exists.");
      }
      await fs.renameFile(oldpath, newpath);
      this.bus.emit(FileEvent.FileMoved, oldpath, newpath);
      return Promise.resolve();
    }
    return Promise.reject("Invalid path.");
  }
  onMoved(listener: (oldpath: string, newpath: string) => void) {
    return this.bus.on(FileEvent.FileMoved, listener);
  }

  // Resolve the filepath within the workspace root or reject.
  private withinRoot(filepath: string): string | null {
    filepath = path.resolve(this.root, filepath);

    if (filepath.startsWith(this.root)) {
      return filepath;
    } else {
      return null;
    }
  }
  // try find a path of a unused filename, if file exists, add a number to the filename, until success
  private async tryCreatePath(trypath: string): Promise<string> {
    trypath = this.withinRoot(trypath)!;
    if (!trypath) {
      return Promise.reject("Invalid path.");
    }
    let count = 1;
    const p = path.parse(trypath);
    while (await fs.exists(trypath)) {
      trypath = path.join(p.dir, p.name + " " + count.toString() + p.ext);
      count++;
    }
    return trypath;
  }
}
