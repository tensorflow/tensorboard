/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

//! Reservoir sampling with preemption and deferred commits.

use rand::{
    distributions::{Distribution, Uniform},
    Rng, SeedableRng,
};
use rand_chacha::ChaCha20Rng;

use crate::types::Step;

/// A [reservoir sampling] data structure, with support for preemption and deferred "commits" of
/// records to a separate destination for better concurrency.
///
/// This structure always keeps the latest record in the reservoir, and therefore must inspect
/// every record in the stream. (One exception: when the reservoir's capacity is zero, it does not
/// retain any records, even the latest one.)
///
/// # Preemption
///
/// All records stored in this reservoir have a *step* and a *payload*. The step, a non-negative
/// integer, is expected to be monotonically (strictly) increasing over time. Whenever a new record
/// arrives with step `s`, it preempts any records with steps not smaller than `s`.
///
/// This is motivated by preemptions of nondeterministic training jobs. If a job is checkpointed at
/// step 80 and preempted at step 100, any metrics written between steps 81 and 100 will be
/// recomputed when the job restarts. Since the outputs may be nondeterministic, the old values
/// must be discarded to avoid a misleading discontinuity between steps 100 and 101.
///
/// For the purpose of this reservoir, preemption is considered a normal mode of operation, not an
/// error. However, jobs incorrectly configured to emit non-increasing steps without being
/// preempted may find that this reservoir does not behave as they expect. For instance, a job that
/// emits many records all at step 0 will find that only one record is retained in the reservoir.
///
/// # Deferred commits
///
/// This reservoir is designed to maximize throughput of reading records from disk while still
/// providing a live-updating view to clients. To do so, we separate the data structures that the
/// reading worker must modify from the clients' view. Each reservoir has an associated [`Basin`],
/// which holds the events that have been committed and made visible to clients. The worker may own
/// the stage exclusively, without any locks or synchronization. At any time, the worker may take a
/// write-lock of the basin and update it with the changes from the reservoir. (The reservoir
/// drains into the basin.) For instance, the worker might have a policy of committing "every 1000
/// records read, or every 10 large records read, or every 5 seconds, whichever comes first".
///
/// The commit operation is quite fast: not only does it not do much work per record being
/// committed, it only commits records that have made it through the sampling process. Thus, if
/// 1000 records are read and 900 of them are discarded, deferring the commit operation will have
/// saved 900 records' worth of wasted copies, compared to if the basin were always kept exactly up
/// to date. Assuming that the basin is shared under a [`std::sync::RwLock`] or similar, the
/// critical section in which the worker needs a write-lock should be short, and thus clients may
/// normally enjoy an uncontended view of the basin.
///
/// [reservoir sampling]: https://en.wikipedia.org/wiki/Reservoir_sampling
#[derive(Debug)]
pub struct StageReservoir<T, C = ChaCha20Rng> {
    /// Steps of items currently in the reservoir whose values have already been committed.
    ///
    /// Stored in step-sorted order, and all steps in `committed_steps` precede all steps in
    /// `staged_items`.
    committed_steps: Vec<Step>,
    /// Items currently in the reservoir but not yet committed.
    ///
    /// Stored in step-sorted order, and all steps in `staged_items` succeed all steps in
    /// `committed_steps`.
    staged_items: Vec<(Step, T)>,
    /// Total capacity of this reservoir.
    ///
    /// The combined physical capacities of `committed_steps` and `staged_items` may exceed this,
    /// but their combined lengths will not.
    capacity: Capacity,
    /// Reservoir control, to determine whether and whither a given new record should be included.
    ctl: C,
    /// Estimate of the total number of non-preempted records passed in the stream so far,
    /// regardless of whether they were ever added to the reservoir.
    ///
    /// This value is usually called capital-*N* in the literature. The estimate is exact for
    /// record streams with no preemptions. When a preemption occurs, the total number of records
    /// preempted from the stream is estimated linearly from the proportion of records preempted
    /// from the reservoir.
    ///
    /// It always holds that `self.len() <= self.seen`, even when `self.seen` is not exact.
    ///
    /// Exception: when `capacity == 0`, `seen` is always `0` as well. A reservoir with no capacity
    /// is inert and has no need to track `seen`.
    seen: usize,
}

/// Reservoir capacity, determining if and when items should start being evicted.
#[derive(PartialEq, Eq, Debug, Copy, Clone)]
pub enum Capacity {
    /// The reservoir may have arbitrarily many records.
    ///
    /// An unbounded reservoir still supports preemption, but otherwise behaves like a normal
    /// vector.
    Unbounded,
    /// The reservoir may have at most a fixed number of records.
    Bounded(usize),
}

impl From<usize> for Capacity {
    fn from(n: usize) -> Self {
        Capacity::Bounded(n)
    }
}

/// A buffer of records that have been committed and not yet evicted from the reservoir.
///
/// This is a snapshot of the reservoir contents at some point in time that is periodically updated
/// by calling [`StageReservoir::commit`].
#[derive(Debug, Clone)]
pub struct Basin<T>(Vec<(Step, T)>);

impl<T> Basin<T> {
    /// Creates an empty basin.
    pub fn new() -> Self {
        Basin(Vec::new())
    }

    /// Extracts a slice containing the entire basin.
    pub fn as_slice(&self) -> &[(Step, T)] {
        &self.0[..]
    }
}

impl<T> Default for Basin<T> {
    fn default() -> Self {
        Self::new()
    }
}

/// A `ReservoirControl` determines which records from a stream should be included into a
/// reservoir, and which records they should evict.
///
/// This is usually backed by a random number generator, but may be made deterministic for testing.
pub trait ReservoirControl {
    /// Upon seeing the latest record in a stream of `n` so far, rolls for the index into the
    /// reservoir that should be evicted to make room for this record. If the result is greater
    /// than or equal to the capacity of the reservoir, the record will be skipped; otherwise, it
    /// will evict the record at the given index. The input `n` will be positive, and the result
    /// must be in `0..n`.
    ///
    /// A useful implementation is to simply roll a random integer in `0..n`. Test code may wish to
    /// provide an alternate, deterministic implementation.
    fn destination(&mut self, n: usize) -> usize;
}

impl<R: Rng> ReservoirControl for R {
    fn destination(&mut self, n: usize) -> usize {
        Uniform::from(0..n).sample(self)
    }
}

impl<T> StageReservoir<T, ChaCha20Rng> {
    /// Creates a new reservoir with the specified capacity, using a fixed-seed random number
    /// generator for reservoir control.
    ///
    /// All reservoirs created by this function will use the same sequence of random numbers.
    ///
    /// This function does not allocate. Reservoir capacity is allocated as records are offered.
    pub fn new(capacity: impl Into<Capacity>) -> Self {
        Self::with_control(capacity.into(), ChaCha20Rng::seed_from_u64(0))
    }
}

impl<T, C: ReservoirControl> StageReservoir<T, C> {
    /// Creates a new reservoir with the specified capacity and reservoir control.
    ///
    /// This function does not allocate. Reservoir capacity is allocated as records are offered.
    pub fn with_control(capacity: impl Into<Capacity>, ctl: C) -> Self {
        Self {
            committed_steps: Vec::new(),
            staged_items: Vec::new(),
            capacity: capacity.into(),
            ctl,
            seen: 0,
        }
    }

    /// Offers a record to the reservoir.
    ///
    /// The reservoir will always include the latest record. Other than the latest record, the
    /// records kept form a simple random sample of the stream (or at least approximately so in the
    /// case of preemptions).
    pub fn offer(&mut self, step: Step, v: T) {
        if self.capacity == Capacity::Bounded(0) {
            return;
        }
        self.preempt(step);
        self.seen += 1;

        if let Capacity::Bounded(capacity) = self.capacity {
            // If we can hold every record that we've seen, we can add this record unconditionally.
            // Otherwise, we need to roll a destination---even if there's available space, to avoid
            // bias right after a preemption.
            if self.seen > capacity {
                let dst = self.ctl.destination(self.seen);
                if dst >= capacity {
                    // Didn't make the cut? Keep-last only.
                    self.pop();
                } else if self.len() >= capacity {
                    // No room? Evict the destination.
                    // From `if`-guards, we know `dst < capacity <= self.len()`, so this is safe.
                    self.remove(dst);
                }
            }
        }
        // In any case, add to end.
        self.staged_items.push((step, v));
    }

    /// Returns the number of items in the reservoir, including both committed and staged items.
    fn len(&self) -> usize {
        self.committed_steps.len() + self.staged_items.len()
    }

    /// Pops the last item in this reservoir, which will be a staged item if there is one or a
    /// committed step otherwise.
    ///
    /// Has no effect if the reservoir is empty.
    fn pop(&mut self) {
        if self.staged_items.pop().is_none() {
            self.committed_steps.pop();
        }
    }

    /// Removes an item at the given index in the sequence of items in the reservoir, including
    /// both committed and staged items.
    ///
    /// # Panics
    ///
    /// Panics if `index >= self.len()`.
    fn remove(&mut self, index: usize) {
        if index < self.committed_steps.len() {
            self.committed_steps.remove(index);
        } else {
            self.staged_items.remove(index - self.committed_steps.len());
        }
    }

    /// Accesses a view of the currently staged items. This includes all items that have been added
    /// to the reservoir since the last commit and have not been evicted.
    pub fn staged_items(&self) -> &[(Step, T)] {
        &self.staged_items[..]
    }

    /// Preempts any records whose step does not precede the given step.
    fn preempt(&mut self, step: Step) {
        let old_len = self.len();
        let staged_preempted = self
            .staged_items
            .iter()
            .rev()
            .take_while(|(s, _)| *s >= step)
            .count();
        if staged_preempted > 0 {
            self.staged_items
                .truncate(self.staged_items.len() - staged_preempted);
        }
        if self.staged_items.is_empty() {
            // Committed steps may have been preempted as well. Note: we can hit this case even if
            // `staged_preempted == 0`, since `staged_items` may have been empty to begin with.
            let committed_preempted = self
                .committed_steps
                .iter()
                .rev()
                .take_while(|s| **s >= step)
                .count();
            if committed_preempted > 0 {
                self.committed_steps
                    .truncate(self.committed_steps.len() - committed_preempted);
            }
        }
        let new_len = self.len();
        if new_len == old_len {
            return; // No need to adjust `seen`.
        }
        // Update our estimate of `seen` assuming that the fraction of sampled-records preempted is
        // the same as the fraction of seen-records preempted. Note: when preempting to or before
        // the earliest-written step, `self.len()` will now be `0`, so we will reset `seen` to
        // exactly `0`, as desired.
        //
        // This preserves that `self.len() <= self.seen` because:
        //
        // ```none
        // old_seen >= old_len  (by induction)
        // old_seen * new_len >= old_len * new_len
        // (old_seen * new_len) / old_len >= (old_len * new_len) / old_len
        // (old_seen * new_len) / old_len >= new_len  (since the above integer division is exact)
        // new_seen >= new_len
        // ```
        let old_seen = self.seen;
        let new_seen = ((old_seen as u64 * new_len as u64) / old_len as u64) as usize;
        debug_assert!(
            new_seen >= new_len,
            "old (len, seen) = {:?}, new (len, seen) = {:?}; wanted seen >= len",
            (old_len, old_seen),
            (new_len, new_seen),
        );
        self.seen = new_seen;
    }

    /// Commits pending changes from this reservoir into a basin.
    ///
    /// The basin should initially be empty and should be modified only by calls to
    /// `commit`/`commit_map` on this reservoir.
    pub fn commit(&mut self, basin: &mut Basin<T>) {
        self.commit_map(basin, |t| t)
    }

    /// Commits pending changes from this reservoir into a basin, applying a mapping function
    /// to each new value.
    ///
    /// This can be used to perform relatively expensive conversions or enrichments only for
    /// records that are actually committed. The basin should initially be empty and should be
    /// modified only by calls to `commit`/`commit_map` on this reservoir.
    pub fn commit_map<S, F: FnMut(T) -> S>(&mut self, basin: &mut Basin<S>, mut f: F) {
        let mut keep_steps = self.committed_steps.iter().peekable();
        basin.0.retain(|(s, _)| match keep_steps.peek() {
            Some(t) if *s == **t => {
                keep_steps.next();
                true
            }
            _ => false,
        });
        self.committed_steps
            .extend(self.staged_items.iter().map(|(step, _)| *step));
        basin
            .0
            .extend(self.staged_items.drain(..).map(|(step, t)| (step, f(t))));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::VecDeque;

    /// A `ReservoirControl` that reads from a predetermined sequence of values.
    #[derive(Debug)]
    struct ScriptedControl(VecDeque<usize>);

    impl ScriptedControl {
        fn new() -> Self {
            ScriptedControl(VecDeque::new())
        }
    }

    impl ReservoirControl for ScriptedControl {
        fn destination(&mut self, n: usize) -> usize {
            let result = self.0.pop_front().expect("overran script");
            assert!(result < n, "bad script: {} >= {}", result, n);
            result
        }
    }

    impl Extend<usize> for ScriptedControl {
        fn extend<T: IntoIterator<Item = usize>>(&mut self, iter: T) {
            self.0.extend(iter)
        }
    }

    /// Extracts the steps from a basin. Convenient for tests.
    fn steps<T>(basin: &Basin<T>) -> Vec<Step> {
        basin.as_slice().iter().map(|(s, _)| *s).collect()
    }

    #[test]
    fn test_sampling_no_preemptions() {
        let mut rsv = StageReservoir::with_control(7, ScriptedControl::new());
        let mut head = Basin::new();
        fn mapper(s: &str) -> &str {
            // leak, for test convenience
            Box::leak(format!(":{}:", s).into_boxed_str())
        }

        rsv.offer(Step(0), "zero");
        rsv.offer(Step(1), "one");
        rsv.offer(Step(2), "two");
        rsv.offer(Step(3), "three");
        rsv.commit_map(&mut head, mapper);
        assert_eq!(
            head.as_slice(),
            &[
                (Step(0), ":zero:"),
                (Step(1), ":one:"),
                (Step(2), ":two:"),
                (Step(3), ":three:")
            ],
        );

        rsv.offer(Step(4), "four");
        rsv.offer(Step(5), "five");
        rsv.offer(Step(6), "six");
        rsv.ctl.extend(vec![3]);
        rsv.offer(Step(7), "seven"); // this one exceeds capacity, evicting index 3
        rsv.commit_map(&mut head, mapper);
        assert_eq!(
            head.as_slice(),
            &[
                (Step(0), ":zero:"),
                (Step(1), ":one:"),
                (Step(2), ":two:"),
                (Step(4), ":four:"),
                (Step(5), ":five:"),
                (Step(6), ":six:"),
                (Step(7), ":seven:"),
            ],
        );

        rsv.ctl.extend(vec![3, 7, 6]);
        rsv.offer(Step(8), "eight"); // evict index 3 (now "four")
        rsv.offer(Step(9), "nine"); // 7 >= 7, so drop (evict most recent)
        rsv.offer(Step(10), "ten"); // evict index 6 (now "nine")
        rsv.commit_map(&mut head, mapper);
        assert_eq!(
            head.as_slice(),
            &[
                (Step(0), ":zero:"),
                (Step(1), ":one:"),
                (Step(2), ":two:"),
                (Step(5), ":five:"),
                (Step(6), ":six:"),
                (Step(7), ":seven:"),
                (Step(10), ":ten:"),
            ],
        );
    }

    /// Tests some desired properties about sampling and preemption. This uses seeded RNG, but the
    /// seed is arbitrary.
    #[test]
    fn test_sampling_preemption() {
        // Seeded RNG, with tests for some invariants.
        let mut rsv = StageReservoir::new(10);
        let mut head = Basin::new();

        // Fill with `[i * i for i in range(1, 11)]`, exactly filling the reservoir.
        for i in 1..=10 {
            rsv.offer(Step(i * i), ());
            if i % 5 == 0 {
                rsv.commit(&mut head);
                assert_eq!(
                    head.as_slice(),
                    (1..=i)
                        .map(|j| (Step(j * j), ()))
                        .collect::<Vec<_>>()
                        .as_slice(),
                );
            }
        }

        // Fill with more square numbers, keeping last but not overflowing.
        for i in 11..=16 {
            rsv.offer(Step(i * i), ());
            rsv.commit(&mut head);
            assert_eq!(head.as_slice().len(), 10);
            assert_eq!(head.as_slice().last(), Some(&(Step(i * i), ())));
        }

        // Seen 16 records, keeping 10. Preempt to invalidate records 9..=16, that the reservoir
        // must have between 2 and 8 old records before the new one is added.
        rsv.offer(Step(70), ()); // 8 * 8 < 70 < 9 * 9
        rsv.commit(&mut head);
        assert!(
            (2..=9).contains(&head.as_slice().len()),
            "want 2 <= {} <= 9: {:?}",
            head.as_slice().len(),
            head
        );
        assert!(
            head.as_slice().iter().all(|(s, _)| *s <= Step(70)),
            "want all <= 70: {:?}",
            head
        );
        assert_eq!(head.as_slice().last(), Some(&(Step(70), ())));

        // One more sanity check: add another record. The "70" preemption may or may not be
        // evicted, but this new record should be the last.
        rsv.offer(Step(71), ());
        rsv.commit(&mut head);
        assert_eq!(head.as_slice().last(), Some(&(Step(71), ())));
    }

    /// Tests that a reservoir may reject a record (modulo keep-last) even if there is sufficient
    /// capacity available, if it is estimated that the total number of records seen exceeds the
    /// capacity.
    ///
    /// Without this, the reservoir's sampling is biased. Consider a reservoir of capacity 1000
    /// into which 1 million records have been offered, at sequential steps. Suppose that we
    /// preempt back to step 900_000, and suppose that this leaves the reservoir with 900/1000
    /// slots filled. If we add the next record unconditionally, then that record has probability 1
    /// of being sampled, whereas all the other records have probability 1/1000. This is
    /// nonuniform.
    ///
    /// This test case uses smaller numbers (`n = 4`, `N = 16`), but exhibits the same idea.
    #[test]
    fn test_unbiased_even_with_space_after_preemption() {
        let mut rsv = StageReservoir::with_control(4, ScriptedControl::new());
        let mut head = Basin::new();

        // Offer:
        //   - (0..4), filling capacity
        //   - (4..8), evicting to form [1, 3, 5, 7]
        //   - (8..16), evicting to form [3, 7, 11, 15]
        (0..4).for_each(|i| rsv.offer(Step(i), ()));
        rsv.ctl.extend(vec![0, 1, 2, 3]);
        (4..8).for_each(|i| rsv.offer(Step(i), ()));
        rsv.ctl.extend(vec![0, 8, 1, 9, 2, 10, 3, 11]);
        (8..16).for_each(|i| rsv.offer(Step(i), ()));
        rsv.commit(&mut head);
        assert_eq!(steps(&head), vec![Step(3), Step(7), Step(11), Step(15)]);
        assert_eq!(rsv.seen, 16);

        // Offer step 4, preempting 12/16 of stream (estimated, and also exactly).
        rsv.ctl.extend(vec![3]);
        rsv.offer(Step(4), ());
        assert_eq!(rsv.seen, 5); // had 16, preempted 12, offered 1
        rsv.commit(&mut head);
        assert_eq!(steps(&head), vec![Step(3), Step(4)]);

        // Offer another record, evicting even though we have capacity.
        rsv.ctl.extend(vec![4]);
        rsv.offer(Step(5), ());
        rsv.commit(&mut head);
        assert_eq!(steps(&head), vec![Step(3), Step(5)]); // kept last only
    }

    #[test]
    fn test_deterministic_and_commit_independent() {
        let mut r1 = StageReservoir::new(10);
        let mut r2 = StageReservoir::new(10);
        let mut h1 = Basin::new();
        let mut h2 = Basin::new();
        for i in 0..100 {
            r1.offer(Step(i), ());
            r2.offer(Step(i), ());
            match i % 10 {
                2 => r1.commit(&mut h1),
                7 => r2.commit(&mut h2),
                9 => {
                    r1.commit(&mut h1);
                    r2.commit(&mut h2);
                    assert_eq!(h1.as_slice(), h2.as_slice());
                }
                _ => (),
            }
        }
    }

    #[test]
    fn test_unbounded() {
        let mut rsv = StageReservoir::new(Capacity::Unbounded);
        let mut head = Basin::new();

        rsv.commit(&mut head);
        assert_eq!(head.as_slice(), &[]);

        rsv.offer(Step(0), "before");
        rsv.offer(Step(1), "before");
        rsv.offer(Step(2), "before");
        rsv.offer(Step(4), "before");
        rsv.commit(&mut head);
        assert_eq!(
            head.as_slice(),
            &[
                (Step(0), "before"),
                (Step(1), "before"),
                (Step(2), "before"),
                (Step(4), "before")
            ]
        );

        rsv.offer(Step(2), "after");
        rsv.offer(Step(5), "after");
        rsv.commit(&mut head);
        assert_eq!(
            head.as_slice(),
            &[
                (Step(0), "before"),
                (Step(1), "before"),
                (Step(2), "after"),
                (Step(5), "after")
            ]
        );
    }

    #[test]
    fn test_empty() {
        let mut rsv = StageReservoir::new(0);
        let mut head = Basin::new();
        for mut i in 0..100 {
            if i > 60 {
                i -= 20; // "preemption", but not really, since no records
            }
            rsv.offer(Step(i), ());
            assert_eq!(rsv.staged_items(), &[]);
            if i % 5 == 0 {
                rsv.commit(&mut head);
                assert_eq!(head.as_slice(), &[]);
            }
        }
    }

    /// Tests that when a reservoir is preempted back to its first-read record, we reset `seen` to
    /// exactly zero, so that the next `capacity - 1` records may be read unconditionally. You can
    /// imagine implementations of a reservoir whose `seen` estimation rounds in such a way that
    /// this doesn't hold. That would be confusing for training jobs that are preempted before they
    /// reach their first checkpoint.
    #[test]
    fn test_preempt_to_start() {
        let (rng_line, rng_file) = (line!() + 1, file!()); // for error message below
        let rng = ChaCha20Rng::seed_from_u64(0);
        let mut rsv = StageReservoir::with_control(10, rng);
        let mut head = Basin::new();
        for i in 0..10_000 {
            rsv.offer(Step(i), ());
        }
        rsv.commit(&mut head);
        assert_eq!(head.as_slice().len(), 10);
        // If step 0 happened to be sampled, we can't test this usefully. Complain so that people
        // fix the test.
        assert_ne!(
            head.as_slice().first().expect("head empty after commit").0,
            Step(0),
            "step 0 happened to stay in the reservoir, which is unlikely but \
            possible (0.1% chance); if changing the RNG seed on {}:{} doesn't \
            fix this, there may be a bug (committed steps: {:?})",
            rng_file,
            rng_line,
            steps(&head),
        );

        // Preempt back to step 0.
        assert_eq!(rsv.seen, 10_000);
        rsv.offer(Step(0), ());
        assert_eq!(rsv.seen, 1); // just the newest record

        // Offer more points: all should be accepted.
        for i in 1..8 {
            rsv.offer(Step(i), ());
        }
        rsv.commit(&mut head);
        assert_eq!(steps(&head), (0..8).map(Step).collect::<Vec<_>>());
        assert_eq!(rsv.seen, 8);
    }
}
