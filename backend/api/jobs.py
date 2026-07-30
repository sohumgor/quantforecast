"""In-process job store for async backtest execution.

A local single-user app doesn't need an external queue (Celery/Redis) —
a `ThreadPoolExecutor` plus an in-memory dict keyed by `job_id` is sufficient.
Job state is lost on server restart; acceptable for this scope (see
documentation/architecture.md for the noted durability trade-off).
"""

from __future__ import annotations

import threading
import uuid
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Literal

JobStatus = Literal["queued", "running", "done", "failed", "cancelled"]


class JobCancelled(Exception):
    """A job function raises this (or has it raised on its behalf) to mark
    the job's terminal status as "cancelled" instead of "failed"."""


@dataclass
class Job:
    job_id: str
    status: JobStatus = "queued"
    result: object | None = None
    error: str | None = None
    # Human-readable stage name (e.g. "running_backtests"), updated by the
    # job function via `JobStore.report_progress` for real progress reporting
    # instead of a client-side timer.
    stage: str | None = None
    progress: tuple[int, int] | None = None  # (completed, total) units of `stage`, if known


class JobStore:
    """In-process job store for async backtest execution. A submitted job
    function receives its own `job_id` so it can report progress and check
    for cancellation via the same store, without a separate handle type.
    """

    def __init__(self, max_workers: int = 2) -> None:
        self._jobs: dict[str, Job] = {}
        self._cancel_events: dict[str, threading.Event] = {}
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=max_workers)

    def submit(self, fn: Callable[[str], object]) -> str:
        job_id = uuid.uuid4().hex[:12]
        with self._lock:
            self._jobs[job_id] = Job(job_id=job_id)
            self._cancel_events[job_id] = threading.Event()
        self._executor.submit(self._run, job_id, fn)
        return job_id

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def report_progress(
        self, job_id: str, stage: str, completed: int | None = None, total: int | None = None
    ) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            job.stage = stage
            if completed is not None and total is not None:
                job.progress = (completed, total)
            else:
                job.progress = None

    def cancel_event(self, job_id: str) -> threading.Event:
        return self._cancel_events[job_id]

    def cancel(self, job_id: str) -> bool:
        """Requests cooperative cancellation. Returns False if the job is
        already finished (or unknown) and cancellation is moot."""
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None or job.status in ("done", "failed", "cancelled"):
                return False
        self._cancel_events[job_id].set()
        return True

    def _run(self, job_id: str, fn: Callable[[str], object]) -> None:
        with self._lock:
            self._jobs[job_id].status = "running"
        try:
            result = fn(job_id)
        except JobCancelled:
            with self._lock:
                self._jobs[job_id].status = "cancelled"
            return
        except Exception as exc:  # surfaced via job.error, not re-raised
            with self._lock:
                self._jobs[job_id].error = str(exc)
                self._jobs[job_id].status = "failed"
            return
        with self._lock:
            self._jobs[job_id].result = result
            self._jobs[job_id].status = "done"
