import { clearCache } from "../ipc/typst";
import { EventBus } from "./bus";
import { default_config, type AppConfig } from "./config";
import { FileManager } from "./file";
import { Notification } from "./notification";
import path from "path-browserify";

declare global {
    interface Window {
      nole?: Nole;
    }
  }

export class Nole {
    public bus: EventBus;
    public root: string;
    public config: AppConfig;
    public fs: FileManager;
    public framesCache: FramesCache;
    public notify: Notification;

    constructor(root:string) {
        this.bus = new EventBus();
        this.root = path.resolve(root);
        this.config = this.loadConfig();
        this.fs = new FileManager(this.config.root!, this.bus);
        this.framesCache = new FramesCache();
        this.notify = new Notification();
    }
    loadConfig(): AppConfig {
        return default_config;
    }
    workspace(): string {
        return this.root;
    }
    clearCache(): void {
        clearCache();
        this.framesCache.clear();
    }
}

class FramesCache {
    private caches: Map<number, string>;
    constructor() {
        this.caches = new Map();
    }

    public set(key:number, value:string) {
        this.caches.set(key, value);
    }

    
    public get(key:number) : string|undefined {
        return this.caches.get(key);
    }
    

    getPages(n_pages: number): string[] {
        const sortedValues: string[] = [];

        for (let i = 0; i < n_pages; i++) {
            const value = this.caches.get(i);
            if (value !== undefined) {
                sortedValues.push(value);
            }
        }

        return sortedValues;
    }
    clear() {
        this.caches.clear();
    }
}