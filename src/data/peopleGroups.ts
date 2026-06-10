import { query, exec, transaction } from '@/db'
import type { PeopleGroup, Person } from '@/types/people'
import { update } from './utils'

const columns = ['name']

export async function getAllPeopleGroups(): Promise<PeopleGroup[]> {
    return query<PeopleGroup>(
        `SELECT people_groups.*,
            (SELECT COUNT(*) FROM person_in_group
                WHERE person_in_group.people_group_id = people_groups.id
                AND person_in_group.deleted_at IS NULL
            ) as member_count
        FROM people_groups
        WHERE people_groups.deleted_at IS NULL
        ORDER BY people_groups.name`
    )
}

export async function getPeopleGroup(id: string): Promise<PeopleGroup | undefined> {
    const rows = await query<PeopleGroup>(
        'SELECT * FROM people_groups WHERE id = ? AND deleted_at IS NULL',
        [id]
    )

    const group = rows[0]
    if (!group) return undefined

    group.people = await query<Person>(
        `SELECT people.*
        FROM people INNER JOIN person_in_group ON person_in_group.person_id = people.id
            WHERE person_in_group.people_group_id = ?
            AND people.deleted_at IS NULL
            AND person_in_group.deleted_at IS NULL
            ORDER BY people.firstname, people.lastname
        `, [id]
    )

    return group
}

export async function createPeopleGroup(input: {
    name: string, person_ids?: string[]
}): Promise<PeopleGroup | undefined> {
    let group: PeopleGroup | undefined

    await transaction(async () => {
        const rows = await query<PeopleGroup>(
            'INSERT INTO people_groups (name) VALUES (?) RETURNING *',
            [input.name]
        )
        group = rows[0]

        if (group && input.person_ids) {
            for (const personId of input.person_ids) {
                await exec(
                    'INSERT INTO person_in_group (person_id, people_group_id) VALUES (?, ?)',
                    [personId, group.id]
                )
            }
        }
    })

    return group
}

export async function updatePeopleGroup(id: string, data: Record<string, unknown>): Promise<void> {
    await update('people_groups', columns, id, data)
}

export async function addPersonToGroup(personId: string, groupId: string): Promise<void> {
    await exec(
        `INSERT INTO person_in_group (person_id, people_group_id, deleted_at)
            VALUES (?, ?, NULL)
            ON CONFLICT(person_id, people_group_id)
            DO UPDATE SET deleted_at = NULL
        `, [personId, groupId]
    )
}

export async function removePersonFromGroup(personId: string, groupId: string): Promise<void> {
    await exec(
        'UPDATE person_in_group SET deleted_at = unixepoch() WHERE person_id = ? AND people_group_id = ?',
        [personId, groupId]
    )
}
