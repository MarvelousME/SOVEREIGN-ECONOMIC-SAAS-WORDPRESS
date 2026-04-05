/**
 * Split SQL on semicolons outside $$ ... $$ blocks (PL/pgSQL bodies).
 * @param {string} sql
 * @returns {string[]}
 */
function splitSqlStatements(sql) {
    const statements = [];
    let buf = '';
    let i = 0;
    let inDollarQuote = false;

    while (i < sql.length) {
        const c = sql[i];
        const next = sql[i + 1];

        if (!inDollarQuote && c === '-' && next === '-') {
            while (i < sql.length && sql[i] !== '\n') {
                i++;
            }
            if (i < sql.length) {
                i++;
            }
            continue;
        }

        if (!inDollarQuote && c === '$' && next === '$') {
            inDollarQuote = true;
            buf += '$$';
            i += 2;
            continue;
        }

        if (inDollarQuote && c === '$' && next === '$') {
            inDollarQuote = false;
            buf += '$$';
            i += 2;
            continue;
        }

        if (!inDollarQuote && c === ';') {
            const trimmed = buf.trim();
            if (trimmed) {
                statements.push(trimmed);
            }
            buf = '';
            i++;
            continue;
        }

        buf += c;
        i++;
    }

    const last = buf.trim();
    if (last) {
        statements.push(last);
    }

    return statements.filter((s) => s.length > 0);
}

module.exports = { splitSqlStatements };
