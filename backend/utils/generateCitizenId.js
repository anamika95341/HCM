function generateCitizenId(sequence) {
  const padded = String(sequence).padStart(8, '0');
  return `CTZ-${new Date().getFullYear()}-${padded}`;
}

module.exports = generateCitizenId;
