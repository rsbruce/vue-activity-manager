export type ProjectStatus = 'active' | 'upcoming' | 'complete'

export type ProjectCategory = {
    id: string
    name: string
    color_scheme: string
    order: number | null
    deleted_at: string | null
    projects?: Project[]
    general_project_id?: string | null
    // populated on the index
    project_count?: number
}

export type Project = {
    id: string
    name: string
    description: string | null
    active: boolean
    completed_at: number | null
    project_category_id: string | null
    order: number | null
    deleted_at: string | null
    // derived
    status?: ProjectStatus
    // relations
    objectives?: Objective[]
    project_area?: ProjectCategory
    // joined category fields (timetable helpers)
    area_name?: string | null
    color_scheme?: string | null
}

export type Objective = {
    id: string
    name: string
    description: string | null
    project_id: string | null
    order: number | null
    completed_at: number | null
    deleted_at: string | null
    tasks?: Task[]
    project?: Project
    has_description?: boolean
}

export type Task = {
    id: string
    name: string
    description: string | null
    objective_id: string | null
    order: number | null
    completed_at: number | null
    deleted_at: string | null
    objective?: Objective
    has_description?: boolean
}
