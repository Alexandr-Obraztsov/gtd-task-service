const bcrypt = require('bcrypt');
const config = require('../config/env');

const TIMING_EQUALIZER_HASH = bcrypt.hashSync('timing-equalizer-password-1!', config.bcryptRounds);

function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, config.bcryptRounds);
}

function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash || TIMING_EQUALIZER_HASH);
}

module.exports = { hashPassword, verifyPassword };
