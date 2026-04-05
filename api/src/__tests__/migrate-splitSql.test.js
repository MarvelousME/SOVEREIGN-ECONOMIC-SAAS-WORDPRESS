/**
 * Tests for scripts/sql-split.js (used by scripts/migrate.js).
 */

const { splitSqlStatements } = require('../../scripts/sql-split.js');

describe('splitSqlStatements', () => {
    it('splits simple statements on semicolons', () => {
        const sql = 'SELECT 1;\nSELECT 2;';
        const parts = splitSqlStatements(sql);
        expect(parts).toEqual(['SELECT 1', 'SELECT 2']);
    });

    it('does not split semicolons inside dollar-quoted function bodies', () => {
        const sql = `
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER t1 BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;
        const parts = splitSqlStatements(sql);
        expect(parts.length).toBe(2);
        expect(parts[0]).toContain('CREATE OR REPLACE FUNCTION update_updated_at_column()');
        expect(parts[0]).toContain('RETURN NEW;');
        expect(parts[1].trim().toUpperCase()).toContain('CREATE TRIGGER T1');
    });

    it('skips full-line SQL comments between statements', () => {
        const sql = `-- leading comment
SELECT 1;
-- another
SELECT 2;`;
        const parts = splitSqlStatements(sql);
        expect(parts.map((p) => p.trim())).toEqual(['SELECT 1', 'SELECT 2']);
    });
});
