const deoRepository = require('./deo.repository');

async function getAssignedMeetings(deoId) {
  return deoRepository.getAssignedMeetings(deoId);
}

module.exports = { getAssignedMeetings };
