const http = require('http');

function dockerRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      socketPath: '/var/run/docker.sock',
      path,
      method: 'GET',
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data || '[]'));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function calculateCpuPercent(stats) {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuCount = stats.cpu_stats.online_cpus || 1;
  if (cpuDelta <= 0 || systemDelta <= 0) {
    return 0;
  }
  return Number(((cpuDelta / systemDelta) * cpuCount * 100).toFixed(2));
}

async function collectDockerMetrics() {
  const containers = await dockerRequest('/containers/json');
  const results = [];
  for (const container of containers) {
    const stats = await dockerRequest(`/containers/${container.Id}/stats?stream=false`);
    const memUsedMB = Number(((stats.memory_stats.usage || 0) / 1024 / 1024).toFixed(2));
    const memLimitMB = Number(((stats.memory_stats.limit || 0) / 1024 / 1024).toFixed(2));
    results.push({
      name: (container.Names[0] || '').replace(/^\//, ''),
      cpuPercent: calculateCpuPercent(stats),
      memUsedMB,
      memLimitMB,
      memPercent: memLimitMB ? Number(((memUsedMB / memLimitMB) * 100).toFixed(2)) : 0,
      status: container.State,
    });
  }
  return results;
}

module.exports = { collectDockerMetrics };
