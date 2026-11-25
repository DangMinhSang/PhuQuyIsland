"""Lock ownership and process identity checks protect against duplicate workers."""
import fcntl
import json
import os
from pathlib import Path


class AlreadyRunning(RuntimeError):
    pass


class ProjectLock:
    def __init__(self, path):
        self.path = Path(path)
        self.handle = None

    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.handle = self.path.open('a+')
        try:
            fcntl.flock(self.handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            self.handle.close()
            raise AlreadyRunning('A project orchestrator already holds the exclusive lock')
        self.handle.seek(0)
        self.handle.truncate()
        self.handle.write(str(os.getpid()))
        self.handle.flush()
        return self

    def __exit__(self, *args):
        fcntl.flock(self.handle, fcntl.LOCK_UN)
        self.handle.close()


def process_identity(pid):
    try:
        # The start-time field guards against PID reuse; comm may include spaces.
        stat = Path(f'/proc/{int(pid)}/stat').read_text().rsplit(')', 1)[1].split()
        if stat[0] == 'Z':
            return None
        return stat[19]
    except (FileNotFoundError, ProcessLookupError, ValueError):
        return None


def recover(root, manager):
    session = Path(root) / 'state/SESSION.json'
    if not session.exists():
        return []
    record = json.loads(session.read_text())
    child = record.get('childPid')
    if child and process_identity(child) == record.get('childStart') and record.get('status') == 'RUNNING':
        raise AlreadyRunning('A recorded child is still live. Wait for that exact process; do not start a duplicate.')
    recovered = []
    for task in manager.read():
        if task['status'] == 'IN_PROGRESS' and record.get('taskId') == task['id']:
            status = 'READY' if task['attempts'] < 3 else 'BLOCKED'
            manager.update(task['id'], status, recoveryNote='Previous bounded worker is no longer live; inspect its logs before retrying.')
            recovered.append(task['id'])
    return recovered
