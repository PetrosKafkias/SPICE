import { createDatabase, defaultDatabasePath } from './db.mjs';

const db = await createDatabase();
console.log(`SPICE database migrated and seeded: ${defaultDatabasePath()}`);
db.close();
