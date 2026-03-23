const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function usage() {
  console.error('Usage: node scripts/generateAdminRegistrationToken.js --key <private-key.pem> --email <admin@email> --designation <designation> [--expires 10m]');
  process.exit(1);
}

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return '';
  }
  return process.argv[index + 1] || '';
}

const keyPathArg = readArg('--key');
const email = readArg('--email');
const designation = readArg('--designation');
const expiresIn = readArg('--expires') || '10m';

if (!keyPathArg || !email || !designation) {
  usage();
}

const keyPath = path.resolve(process.cwd(), keyPathArg);
if (!fs.existsSync(keyPath)) {
  console.error(`Private key file not found: ${keyPath}`);
  process.exit(1);
}

const privateKey = fs.readFileSync(keyPath, 'utf8');
const token = jwt.sign(
  {
    jti: crypto.randomUUID(),
    designation,
  },
  privateKey,
  {
    algorithm: 'RS256',
    subject: email,
    expiresIn,
  }
);

console.log(token);
