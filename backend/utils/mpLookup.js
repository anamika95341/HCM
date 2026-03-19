const mpMap = {
  Delhi: 'New Delhi Constituency MP',
  Maharashtra: 'Maharashtra Regional MP',
  Karnataka: 'Karnataka Regional MP',
  'Tamil Nadu': 'Tamil Nadu Regional MP',
};

function lookupMp({ state }) {
  return mpMap[state] || `${state} Regional MP`;
}

module.exports = { lookupMp };
