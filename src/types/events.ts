import type { Person } from './people'

export type Event = {
    id: string;
    name: string;
    start_datetime: string | null;
    end_datetime: string | null;
    before_notes: string | null;
    after_notes: string | null;
    project_id: string | null;
    objective_id: string | null;
    deleted_at: string | null;
    people?: Person[];
    project?: { id: string; name: string };
    objective?: { id: string; name: string };
}