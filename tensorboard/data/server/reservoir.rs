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

/// A [reservoir sampling] data structure, with support for preemption and deferred "commits" of
/// records to a separate destination for better concurrency.
///
/// This structure always keeps the latest record in the reservoir, and therefore must inspect
/// every record in the stream. (One exception: when the reservoir's capacity is zero, it does not
/// retain any records, even the latest one.)
///
/// **Note:** Preemption support is not yet implemented.
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
    /// but their combined lengths will not. Behavior is undefined if `capacity == 0`.
    capacity: usize,
    /// Reservoir control, to determine whether and whither a given new record should be included.
    ctl: C,
    /// Estimate of the total number of non-preempted records passed in the stream so far,
    /// regardless of whether they were ever added to the reservoir.
    ///
    /// This value is usually called capital-*N* in the literature. The estimate is exact for
    /// record streams with no preemptions. When a preemption occurs, the total number of records
    /// preempted from the stream is estimated linearly from the proportion of records preempted
    /// from the reservoir.
    seen: usize,
}

/// A step associated with a record, strictly increasing over time within a record stream.
#[derive(Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Copy, Clone)]
pub struct Step(pub i64);

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
    pub fn new(capacity: usize) -> Self {
        Self::with_control(capacity, ChaCha20Rng::seed_from_u64(0))
    }
}

impl<T, C: ReservoirControl> StageReservoir<T, C> {
    /// Creates a new reservoir with the specified capacity and reservoir control.
    ///
    /// This function does not allocate. Reservoir capacity is allocated as records are offered.
    pub fn with_control(capacity: usize, ctl: C) -> Self {
        Self {
            committed_steps: Vec::new(),
            staged_items: Vec::new(),
            capacity,
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
        if self.capacity == 0 {
            return;
        }
        self.seen += 1;
        let dst = self.ctl.destination(self.seen);

        if dst >= self.capacity {
            // Didn't make the cut? Keep-last only.
            self.pop();
        } else if self.len() >= self.capacity {
            // No room? Evict the destination.
            // From `if`-guards, we know `dst < self.capacity <= self.len()`, so this is safe.
            self.remove(dst);
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

    #[test]
    fn test() {
        let mut rsv = StageReservoir::with_control(7, ScriptedControl::new());
        let mut head = Basin::new();
        fn mapper(s: &str) -> &str {
            // leak, for test convenience
            Box::leak(format!(":{}:", s).into_boxed_str())
        }

        rsv.ctl.extend(vec![0, 1, 1, 2]);
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

        rsv.ctl.extend(vec![1, 2, 1, 3]);
        rsv.offer(Step(4), "four");
        rsv.offer(Step(5), "five");
        rsv.offer(Step(6), "six");
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

    #[test]
    fn test_random() {
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
    fn test_empty() {
        let mut rsv = StageReservoir::new(0);
        let mut head = Basin::new();
        for i in 0..100 {
            rsv.offer(Step(i), ());
            assert_eq!(rsv.staged_items(), &[]);
            if i % 5 == 0 {
                rsv.commit(&mut head);
                assert_eq!(head.as_slice(), &[]);
            }
        }
    }
}
