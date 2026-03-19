const deoService = require('./deo.service');

async function getAssignedMeetings(req, res, next) {
  try {
    const meetings = await deoService.getAssignedMeetings(req.user.sub);
    res.json({ meetings });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAssignedMeetings };
