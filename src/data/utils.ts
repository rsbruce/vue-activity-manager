import {exec} from '@/db'

export async function softDelete(id: string, table: string): Promise<void> {
  await exec(`UPDATE ${table} SET deleted_at = unixepoch() WHERE id = ?`, [id])
}

export async function update(table: string, columns: string[], id: string, data: Record<string, unknown>): Promise<void> {
    const sets: string[] = []
    const params: unknown[] = []

    columns.forEach((col) => {
        if (data[col] !== undefined) {
            sets.push(`${col} = ?`)
            params.push(data[col])
        }
    })

    if (sets.length === 0) return
    params.push(id)

    await exec(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, params)
}

export async function insert(table: string, columns: string[], data: Record<string, unknown>): Promise<void> {
  
}