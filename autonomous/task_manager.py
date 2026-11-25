"""Atomic on-disk task queue; never infer DONE from a successful process exit."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path

STATES = {'BACKLOG', 'READY', 'IN_PROGRESS', 'BLOCKED', 'TESTING', 'DONE'}


def now():
    return datetime.now(timezone.utc).isoformat()


def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    with temp.open('w') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp, path)


class TaskManager:
    def __init__(self, root):
        self.root = Path(root)
        self.path = self.root / 'state/TASKS.json'

    def read(self):
        tasks = json.loads(self.path.read_text())
        assert isinstance(tasks, list)
        ids = set()
        for task in tasks:
            assert task['id'] not in ids and task['status'] in STATES
            ids.add(task['id'])
            for required in ['description', 'priority', 'dependencies', 'assignedRole', 'acceptanceCriteria', 'attempts', 'lastUpdated']:
                assert required in task, required
        assert all(dependency in ids for task in tasks for dependency in task['dependencies'])
        return tasks

    def update(self, task_id, status, **fields):
        assert status in STATES
        tasks = self.read()
        task = next(t for t in tasks if t['id'] == task_id)
        if status == 'DONE' and not fields.get('verification', task.get('verification')):
            raise ValueError('DONE requires recorded acceptance evidence')
        task.update(status=status, lastUpdated=now(), **fields)
        atomic_json(self.path, tasks)
        return task

    def next_ready(self):
        tasks = self.read()
        done = {t['id'] for t in tasks if t['status'] == 'DONE'}
        available = [t for t in tasks if t['status'] in {'READY', 'BACKLOG'} and set(t['dependencies']) <= done and t['attempts'] < 3]
        return min(available, key=lambda t: t['priority']) if available else None
