import { AppEvent, EventBus } from "./bus";
import { default_config, type AppConfig } from "./config";
import { FileManager } from "./file";
import { Notification } from "./notification";

declare global {
  interface Window {
    nole: Nole;
  }
}

export class Nole {
  public bus: EventBus;
  public root: string;
  public config: AppConfig;
  public fs: FileManager;
  public notify: Notification;

  /**
   * App Instance
   * @param root The canonical root path of the workspace.
   */
  constructor(root: string) {
    this.bus = new EventBus();
    this.root = root;
    this.config = this.loadConfig();
    this.fs = new FileManager(this.root!, this.bus);
    this.notify = new Notification();
    localStorage.setItem("workspace", root);
    this.bus.emit(AppEvent.Init, this);
    window.nole = this;
  }
  loadConfig(): AppConfig {
    return default_config;
  }
  workspace(): string {
    return this.root;
  }
}

