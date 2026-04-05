/**
 * Compile agent-contract.schema.json with Ajv (JSON Schema draft 2020-12)
 * and validate fixtures (valid must pass; invalid must fail).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const schema = JSON.parse(
  readFileSync(join(root, 'agent-contract.schema.json'), 'utf8'),
);
const validFixture = JSON.parse(
  readFileSync(join(root, 'fixtures/agent-contract.valid.json'), 'utf8'),
);
const invalidFixture = JSON.parse(
  readFileSync(join(root, 'fixtures/agent-contract.invalid.json'), 'utf8'),
);

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

let validate;
try {
  validate = ajv.compile(schema);
} catch (e) {
  console.error('Schema compile failed:', e);
  process.exit(1);
}

if (!validate(validFixture)) {
  console.error('Valid fixture should pass:', validate.errors);
  process.exit(1);
}

if (validate(invalidFixture)) {
  console.error(
    'Invalid fixture should fail (missing required fields) but passed.',
  );
  process.exit(1);
}

console.log(
  'OK: agent-contract.schema.json compiles; valid fixture passes; invalid fixture rejected.',
);
