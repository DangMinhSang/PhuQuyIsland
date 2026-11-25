"""Resource admission only; never modifies host services or starts a daemon."""
from pathlib import Path
import os
import shutil


def resources(root):
    mem = {line.split(':')[0]: int(line.split()[1]) * 1024 for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith(('MemAvailable:', 'MemTotal:'))}
    return {'memoryAvailable': mem['MemAvailable'], 'memoryTotal': mem['MemTotal'], 'diskFree': shutil.disk_usage(root).free, 'load1m': os.getloadavg()[0], 'cpus': os.cpu_count() or 1}


def admit(root, minimum_memory=220 * 1024 * 1024, minimum_disk=512 * 1024 * 1024):
    current = resources(root)
    if current['memoryAvailable'] < minimum_memory:
        raise RuntimeError('Not enough available memory for a bounded coding worker')
    if current['diskFree'] < minimum_disk:
        raise RuntimeError('Project disk space below safety reserve')
    if current['load1m'] > current['cpus'] * 3:
        raise RuntimeError('Host load above admission threshold')
    return current
