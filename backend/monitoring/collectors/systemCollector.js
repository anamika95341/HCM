const fs = require('fs/promises');

function parseCpu(line) {
  const [label, user, nice, system, idle, iowait, irq, softirq, steal] = line.trim().split(/\s+/);
  return { user: Number(user), nice: Number(nice), system: Number(system), idle: Number(idle), iowait: Number(iowait), irq: Number(irq), softirq: Number(softirq), steal: Number(steal) };
}

async function readCpuSnapshot() {
  const data = await fs.readFile('/host/proc/stat', 'utf8');
  return parseCpu(data.split('\n')[0]);
}

async function collectSystemMetrics() {
  const first = await readCpuSnapshot();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const second = await readCpuSnapshot();

  const idleDelta = (second.idle + second.iowait) - (first.idle + first.iowait);
  const totalFirst = Object.values(first).reduce((sum, value) => sum + value, 0);
  const totalSecond = Object.values(second).reduce((sum, value) => sum + value, 0);
  const totalDelta = totalSecond - totalFirst;
  const cpuPercent = totalDelta === 0 ? 0 : Number((((totalDelta - idleDelta) / totalDelta) * 100).toFixed(2));

  const meminfo = await fs.readFile('/host/proc/meminfo', 'utf8');
  const memMap = Object.fromEntries(meminfo.trim().split('\n').map((line) => {
    const [key, value] = line.split(':');
    return [key, Number(value.trim().split(/\s+/)[0])];
  }));
  const ramTotalMB = Number((memMap.MemTotal / 1024).toFixed(2));
  const ramAvailableMB = Number((memMap.MemAvailable / 1024).toFixed(2));
  const ramUsedMB = Number((ramTotalMB - ramAvailableMB).toFixed(2));
  const ramPercent = Number(((ramUsedMB / ramTotalMB) * 100).toFixed(2));
  const swapUsedMB = Number((((memMap.SwapTotal - memMap.SwapFree) || 0) / 1024).toFixed(2));

  const stat = await fs.statfs('/');
  const total = stat.blocks * stat.bsize;
  const free = stat.bavail * stat.bsize;
  const diskPercent = Number((((total - free) / total) * 100).toFixed(2));
  const diskFreeGB = Number((free / 1024 / 1024 / 1024).toFixed(2));

  return { cpuPercent, ramPercent, ramUsedMB, ramTotalMB, swapUsedMB, diskPercent, diskFreeGB };
}

module.exports = { collectSystemMetrics };
