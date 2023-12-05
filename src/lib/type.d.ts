export interface RibbonItem {
    name: string
    icon: string
    description?: string
    action: () => void
}