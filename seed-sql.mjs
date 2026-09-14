import { pbkdf2Sync, randomBytes } from "node:crypto";

const ITERATIONS = 210_000;
const KEY_BITS = 32;
const SALT_BYTES = 16;
const TEMP_PASSWORD = "changeme12345";

function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const bits = pbkdf2Sync(password, salt, ITERATIONS, KEY_BITS, "sha256");
  return `pbkdf2$sha256$${ITERATIONS}$${salt.toString("base64")}$${bits.toString("base64")}`;
}

const USERS = [
  { name: "aj", email: "aj@rougetechnologies.co.uk", role: "admin" },
  { name: "dev", email: "dev@rougetechnologies.co.uk", role: "dev" },
  { name: "max", email: "max@rougetechnologies.co.uk", role: "employee" },
  { name: "uma", email: "uma@rougetechnologies.co.uk", role: "employee" },
  { name: "ben", email: "ben@rougetechnologies.co.uk", role: "employee" },
];

const now = Date.now();

console.log(`-- Temp password for ALL users: ${TEMP_PASSWORD}`);
console.log(`-- must_reset_pw = 1 forces a change on first login`);
console.log();

for (const u of USERS) {
  const id = `user_${u.name}`;
  const hash = hashPassword(TEMP_PASSWORD);
  console.log(
    `INSERT INTO users (id, email, name, role, password_hash, is_active, must_reset_pw, created_at, updated_at) VALUES ('${id}', '${u.email}', '${u.name}', '${u.role}', '${hash}', 1, 1, ${now}, ${now});`,
  );
}
