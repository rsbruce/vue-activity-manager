/**
 * Rewrites positional INSERT INTO ... VALUES(...) statements to column-explicit form
 * using column names sourced from CREATE TABLE statements in the same SQL string.
 *
 * This allows SQL dumps (which use positional inserts) to be loaded into a database
 * whose table schemas may have a different column order.
 */
export function rewritePositionalInserts(sql: string): string {
  const tableColumns = new Map<string, string[]>()
  const statements = splitStatements(sql)

  return statements
    .map((stmt) => {
      const trimmed = stmt.trim()
      if (!trimmed) return stmt

      const createMatch = trimmed.match(
        /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?\s*\(/is,
      )
      if (createMatch) {
        const cols = extractColumnsFromCreate(trimmed)
        if (cols.length > 0) tableColumns.set(createMatch[1].toLowerCase(), cols)
        return stmt
      }

      // Only rewrite INSERT INTO <table> VALUES — i.e. no existing column list
      const insertMatch = trimmed.match(
        /^(INSERT\s+(?:OR\s+\w+\s+)?INTO\s+["'`]?(\w+)["'`]?\s+)(VALUES\s*\()/is,
      )
      if (insertMatch) {
        const tableName = insertMatch[2].toLowerCase()
        const cols = tableColumns.get(tableName)
        if (cols) {
          const colList = cols.map((c) => `"${c}"`).join(', ')
          return stmt.replace(insertMatch[0], `${insertMatch[1]}(${colList}) ${insertMatch[3]}`)
        }
      }

      return stmt
    })
    .join(';\n')
}

/** Splits SQL into individual statements on `;`, ignoring semicolons inside string literals. */
function splitStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let inString = false
  let quote = ''

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]

    if (inString) {
      current += ch
      if (ch === quote) {
        // SQL standard escaped quote: '' or ""
        if (sql[i + 1] === quote) {
          current += sql[++i]
        } else {
          inString = false
        }
      }
    } else if (ch === "'" || ch === '"') {
      inString = true
      quote = ch
      current += ch
    } else if (ch === ';') {
      statements.push(current)
      current = ''
    } else {
      current += ch
    }
  }

  if (current.trim()) statements.push(current)
  return statements
}

/** Extracts column names (in order) from a CREATE TABLE statement, skipping constraints. */
function extractColumnsFromCreate(createSql: string): string[] {
  // Find the body between the outermost parentheses
  const openIdx = createSql.indexOf('(')
  if (openIdx === -1) return []

  let depth = 0
  let bodyStart = -1
  let bodyEnd = -1

  for (let i = openIdx; i < createSql.length; i++) {
    if (createSql[i] === '(') {
      if (depth === 0) bodyStart = i + 1
      depth++
    } else if (createSql[i] === ')') {
      depth--
      if (depth === 0) {
        bodyEnd = i
        break
      }
    }
  }

  if (bodyStart === -1 || bodyEnd === -1) return []

  // Split body by top-level commas
  const parts: string[] = []
  let current = ''
  let d = 0

  for (const ch of createSql.slice(bodyStart, bodyEnd)) {
    if (ch === '(') d++
    else if (ch === ')') d--
    else if (ch === ',' && d === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) parts.push(current.trim())

  const columns: string[] = []
  for (const part of parts) {
    // Skip table constraints
    if (/^\s*(primary|foreign|unique|check)\b/i.test(part)) continue
    // Column name: quoted ("name") or bare (name), followed by whitespace
    const m = part.match(/^["'`]?([a-zA-Z_]\w*)["'`]?\s/)
    if (m) columns.push(m[1])
  }

  return columns
}
