const ministerRepository = require('./minister.repository');

async function getCalendar(ministerId) {
  return ministerRepository.getCalendar(ministerId);
}

module.exports = { getCalendar };
