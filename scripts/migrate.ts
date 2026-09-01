import { migrate, closeDb } from '../src/lib/db/client';
migrate();
closeDb();
console.log('Migrations applied.');
