export interface AppConfig {
    resize_render_delay: number;
    compile_delay: number;
    autosave_delay: number;
}

export const default_config = {
    resize_render_delay: 200,
    compile_delay: 0,
    autosave_delay: 1000,
} as AppConfig;