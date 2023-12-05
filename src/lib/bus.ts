import { EventEmitter } from "@tauri-apps/api/shell";

type NoleEvent = AppEvent | FileEvent;

enum AppEvent {
    Init = "app:init",
}

export enum FileEvent {
  FileOpened = "fs:file:opened",
  FileMoved = "fs:moved",
  FileDeleted = "fs:file:deleted",
  DirDeleted = "fs:directory:deleted",
  FileRead = "fs:file:read",
  FileReadBinary = "fs:file:readbinary",
  FileWritten = "fs:file:written",
  FileWrittenBinary = "fs:file:writtenbinary",
  NewFileCreated = "fs:file:created",
  NewDirCreated = "fs:directory:created",
}

export class EventBus {
  private emitter: EventEmitter<NoleEvent>;
  constructor() {
    this.emitter = new EventEmitter();
  }
  on(event: NoleEvent, listener: (...args: any[]) => void) {
    this.emitter.on(event, listener);
    return () => {
        this.emitter.removeListener(event, listener);
      }
  }
  once(event: NoleEvent, listener: (...args: any[]) => void) {
    this.emitter.once(event, listener);
    return () => {
        this.emitter.removeListener(event, listener);
      }
  }
  emit(event: NoleEvent, ...args: any[]) {
    return this.emitter.emit(event, ...args);
  }

  removeAll(event: NoleEvent) {
    this.emitter.removeAllListeners(event);
    return this;
  }
}
