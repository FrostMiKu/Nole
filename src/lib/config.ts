export interface AppConfig {
    // note root path
    render_delay: number;
    compile_delay: number;
    autosave_delay: number;
}

export const default_config = {
    render_delay: 200,
    compile_delay: 200,
    autosave_delay: 200,
} as AppConfig;