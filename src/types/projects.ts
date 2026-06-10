export type ProjectCategory = {
    id: string
    name: string
    color_scheme: string
    order: number | null
    deleted_at: string | null
    projects?: Project[]
}

export type Project = {
    id: string
    name: string
    description: string | null
    active: boolean
    completed_at: string | null
    project_category_id: string | null
    order: number | null
    deleted_at: string | null
    // joined category fields (when loaded with its area)
    area_name?: string | null
    color_scheme?: string | null
}
