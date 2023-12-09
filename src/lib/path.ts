import { resolve } from "@tauri-apps/api/path";

class Path {
    separator: string;

    constructor(separator: string = '/') {
        this.separator = separator;
    }

    /**
     * Return the parent path of the given path
     * @param path 
     * @returns parent path, if the path ends with a separator, the separator will be removed.
     * if the path is empty, return the separator
     */
    dirname(path: string): string {
        const parts = path.split(this.separator);
        // Check if the last element is empty (i.e., the path ends with the separator)
        if (parts[parts.length - 1] === '') {
            parts.pop(); // Remove the empty element
        }
        parts.pop(); // Remove the last path segment
        return parts.join(this.separator) || this.separator;
    }

    basename(path: string): string {
        const base = path.substring(path.lastIndexOf(this.separator) + 1);
        return base;
    }

    name(path: string): string {
        const base = this.basename(path);
        const ext = this.extname(path);
        return base.slice(0, -ext.length);
    }

    /**
     * Return the extname of the given path
     * @param path 
     * @returns extname with dot, if the path has no extname, return empty string
     */
    extname(path: string): string {
        const index = path.lastIndexOf('.');
        const lastSeparatorIndex = path.lastIndexOf(this.separator);
        return index > lastSeparatorIndex ? path.substring(index) : '';
    }

    parse(filepath: string): { base: string; name: string; ext: string; dir: string } {
        const base = this.basename(filepath);
        const ext = this.extname(filepath);
        const dir = this.dirname(filepath);
        const name = base.slice(0, -ext.length);
        return { base, name, ext, dir };
    }

    join(...paths: string[]): string {
        return paths.join(this.separator).replace(/\\/g, this.separator);
    }

    resolve = resolve;
}

let path: Path;
import.meta.env.OS === 'windows' ? path = new Path('\\') : path = new Path('/');

export default path;