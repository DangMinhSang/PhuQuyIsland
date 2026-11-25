import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

from orchestrator import run_session
from recovery import AlreadyRunning, ProjectLock, process_identity, recover
from scheduler import admit
from task_manager import TaskManager, atomic_json


def task(task_id='one', status='READY', dependencies=None):
    return dict(id=task_id, description='test', priority=1, dependencies=dependencies or [], assignedRole='QA', acceptanceCriteria=['verified'], status=status, attempts=0, lastUpdated='2026-11-25')


class AutonomousTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='phu-quy-tests-')
        self.root = Path(self.temp.name)
        atomic_json(self.root / 'state/TASKS.json', [task()])
        self.manager = TaskManager(self.root)

    def tearDown(self):
        self.temp.cleanup()

    def test_exclusive_lock(self):
        with ProjectLock(self.root / 'state/lock'):
            with self.assertRaises(AlreadyRunning):
                with ProjectLock(self.root / 'state/lock'):
                    pass

    def test_done_requires_evidence(self):
        with self.assertRaises(ValueError):
            self.manager.update('one', 'DONE')
        self.manager.update('one', 'DONE', verification=['unit test exit 0'])
        self.assertIsNone(self.manager.next_ready())

    def test_dependency_order_and_attempt_limit(self):
        atomic_json(self.root / 'state/TASKS.json', [task('one', 'TESTING'), task('two', dependencies=['one'])])
        self.assertIsNone(self.manager.next_ready())
        self.manager.update('one', 'DONE', verification=['test'])
        self.assertEqual(self.manager.next_ready()['id'], 'two')
        self.manager.update('two', 'READY', attempts=3)
        self.assertIsNone(self.manager.next_ready())

    def test_resource_admission(self):
        with patch('scheduler.resources', return_value={'memoryAvailable':0, 'diskFree':2**40, 'load1m':0, 'cpus':2}):
            with self.assertRaisesRegex(RuntimeError, 'memory'):
                admit(self.root)

    def test_recovery_does_not_duplicate_live_process(self):
        atomic_json(self.root / 'state/SESSION.json', dict(taskId='one', childPid=os.getpid(), childStart=process_identity(os.getpid()), status='RUNNING'))
        with self.assertRaises(AlreadyRunning):
            recover(self.root, self.manager)

    def test_recovery_requeues_verified_dead_worker(self):
        self.manager.update('one', 'IN_PROGRESS', attempts=1)
        atomic_json(self.root / 'state/SESSION.json', dict(taskId='one', childPid=99999999, childStart='0', status='RUNNING'))
        self.assertEqual(recover(self.root, self.manager), ['one'])
        self.assertEqual(self.manager.read()[0]['status'], 'READY')

    def test_captures_exit_and_usage_without_invoking_codex(self):
        command = [sys.executable, '-c', 'import sys,json;sys.stdin.read();print(json.dumps({"type":"turn.completed","usage":{"input_tokens":7,"output_tokens":3}}));print("diagnostic",file=sys.stderr)']
        with patch('orchestrator.resources', return_value={'memoryAvailable':1024**3, 'diskFree':2**40}):
            result = run_session(command, 'bounded test prompt', self.root, self.root/'logs/success', 3, 100)
        self.assertEqual(result['exitCode'], 0)
        self.assertEqual(result['observedTokens'], 10)
        self.assertIn('diagnostic', (self.root/'logs/success.stderr.log').read_text())

    def test_timeout_terminates_exact_child(self):
        command = [sys.executable, '-c', 'import time;time.sleep(30)']
        with patch('orchestrator.resources', return_value={'memoryAvailable':1024**3, 'diskFree':2**40}):
            result = run_session(command, 'test', self.root, self.root/'logs/timeout', .2, 100)
        self.assertEqual(result['reason'], 'timeout')
        self.assertNotEqual(result['exitCode'], 0)
        session = json.loads((self.root/'state/SESSION.json').read_text())
        self.assertIsNone(process_identity(session['childPid']))


if __name__ == '__main__':
    unittest.main()
