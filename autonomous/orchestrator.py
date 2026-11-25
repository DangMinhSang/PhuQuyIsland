#!/usr/bin/env python3
"""Optional, bounded Codex task runner. Dry-run unless --execute is explicit.

No service installation, no automatic recursive launches, no credentials copied.
"""
import argparse
import json
import os
from pathlib import Path
import selectors
import signal
import subprocess
import time

from recovery import ProjectLock, process_identity, recover
from scheduler import admit, resources
from task_manager import TaskManager, atomic_json, now

ROOT = Path(__file__).resolve().parents[1]


def prompt_for(root, task):
    return f'''Work only in {root}. Read MASTER_PROMPT.md, docs/ROADMAP.md,
state/TASKS.json, state/PROGRESS.json, docs/DECISIONS.md and current Git status.
Task {task['id']} ({task['assignedRole']}): {task['description']}
Acceptance: {json.dumps(task['acceptanceCriteria'])}
Work sequentially; respect existing services and resource limits. Inspect failed
attempt logs before retrying; after three failures change strategy. Complete a
bounded task, run relevant acceptance tests, record concrete evidence in
docs/TEST_REPORT.md, update TASKS/PROGRESS, and commit stable work. Never mark
DONE without verified evidence. Do not launch agents/orchestrators/daemons,
install system packages, modify unrelated files, read secrets, deploy with paid
services or run unbounded subprocesses. Before exiting record remaining work.'''


def terminate_group(process):
    if process.poll() is not None:
        return
    os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=5)


def run_session(command, prompt, root, prefix, timeout, token_budget):
    root, prefix = Path(root), Path(prefix)
    prefix.parent.mkdir(parents=True, exist_ok=True)
    session_path = root / 'state/SESSION.json'
    session = json.loads(session_path.read_text()) if session_path.exists() else {}
    observed_tokens, reason = 0, 'exit'
    started = time.monotonic()
    # stderr goes straight to a bounded-by-session-duration file, never a pipe deadlock.
    with prefix.with_suffix('.stderr.log').open('wb') as errors, prefix.with_suffix('.stdout.jsonl').open('wb') as output:
        process = subprocess.Popen(command, cwd=root, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=errors, start_new_session=True)
        session.update(status='RUNNING', childPid=process.pid, childStart=process_identity(process.pid), startedAt=now())
        atomic_json(session_path, session)
        process.stdin.write(prompt.encode()); process.stdin.close()
        selector = selectors.DefaultSelector(); selector.register(process.stdout, selectors.EVENT_READ)
        os.set_blocking(process.stdout.fileno(), False)
        buffer, bytes_written = b'', 0
        try:
            while True:
                if time.monotonic() - started > timeout:
                    reason = 'timeout'; terminate_group(process)
                if observed_tokens >= token_budget:
                    reason = 'token_budget'; terminate_group(process)
                # Monitor resource pressure during the worker, not only before it starts.
                current = resources(root)
                if current['memoryAvailable'] < 64 * 1024 * 1024:
                    reason = 'memory_pressure'; terminate_group(process)
                if current['diskFree'] < 256 * 1024 * 1024 or os.fstat(errors.fileno()).st_size > 20 * 1024 * 1024:
                    reason = 'disk_or_stderr_limit'; terminate_group(process)
                events = selector.select(timeout=.2)
                for selected, _ in events:
                    chunk = os.read(selected.fileobj.fileno(), 65536)
                    if not chunk:
                        selector.unregister(selected.fileobj)
                        continue
                    bytes_written += len(chunk)
                    if bytes_written > 20 * 1024 * 1024:
                        reason = 'log_limit'; terminate_group(process); break
                    output.write(chunk); output.flush(); buffer += chunk
                    while b'\n' in buffer:
                        line, buffer = buffer.split(b'\n', 1)
                        try:
                            event = json.loads(line)
                            usage = event.get('usage', {})
                            if event.get('type') == 'turn.completed':
                                observed_tokens += int(usage.get('input_tokens', 0)) + int(usage.get('output_tokens', 0))
                        except (ValueError, TypeError):
                            pass
                if process.poll() is not None and not selector.get_map():
                    break
        except BaseException:
            terminate_group(process)
            raise
        finally:
            selector.close(); terminate_group(process); process.stdout.close()
    result = {'exitCode': process.returncode, 'reason': reason, 'observedTokens': observed_tokens, 'elapsedSeconds': round(time.monotonic() - started, 2)}
    session.update(status='FINISHED' if process.returncode == 0 and reason == 'exit' else 'FAILED', finishedAt=now(), **result)
    atomic_json(session_path, session)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true', help='Explicitly authorize bounded Codex invocation (may use account credits)')
    parser.add_argument('--max-runs', type=int, default=1, choices=range(1, 4))
    parser.add_argument('--timeout', type=int, default=300, choices=range(10, 901))
    parser.add_argument('--token-budget', type=int, default=0, help='Required positive observed-token ceiling for execute; max 50,000')
    args = parser.parse_args()
    manager = TaskManager(ROOT)
    if not args.execute:
        task = manager.next_ready()
        print(json.dumps({'dryRun': True, 'resources': resources(ROOT), 'nextTask': task, 'note': 'No child launched. --execute requires bounded runs, timeout and positive token budget.'}, indent=2))
        return
    if not 1 <= args.token_budget <= 50000:
        parser.error('--execute requires --token-budget between 1 and 50000')
    with ProjectLock(ROOT / 'state/orchestrator.lock'):
        recovered = recover(ROOT, manager)
        observed = 0
        for index in range(args.max_runs):
            current = admit(ROOT)
            task = manager.next_ready()
            if task is None or observed >= args.token_budget:
                break
            manager.update(task['id'], 'IN_PROGRESS', attempts=task['attempts'] + 1)
            prefix = ROOT / 'logs' / (time.strftime('%Y%m%d-%H%M%S') + '-' + task['id'])
            atomic_json(ROOT / 'state/SESSION.json', dict(taskId=task['id'], status='STARTING', run=index + 1, resources=current, recovered=recovered))
            command = ['codex', 'exec', '--json', '--sandbox', 'workspace-write', '-C', str(ROOT), '-o', str(prefix.with_suffix('.last.md')), '-']
            result = run_session(command, prompt_for(ROOT, task), ROOT, prefix, args.timeout, args.token_budget - observed)
            observed += result['observedTokens']
            latest = next(t for t in manager.read() if t['id'] == task['id'])
            success = result['exitCode'] == 0 and result['reason'] == 'exit'
            if not success:
                manager.update(task['id'], 'READY' if latest['attempts'] < 3 else 'BLOCKED', lastFailure=result)
            elif latest['status'] == 'IN_PROGRESS':
                manager.update(task['id'], 'TESTING', lastRun=result)
            atomic_json(ROOT / 'state/checkpoints' / (task['id'] + '.json'), {'task': latest, 'result': result, 'observedSessionTokens': observed})
            print(json.dumps({'task':task['id'], **result}), flush=True)
            # A failed strategy is not repeated immediately. Let the next session inspect evidence.
            if not success:
                break


if __name__ == '__main__':
    main()
