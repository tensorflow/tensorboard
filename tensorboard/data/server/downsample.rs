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

//! Downsampling for in-memory sequences.

use rand::SeedableRng;
use rand_chacha::ChaCha20Rng;

/// Downsamples `xs` in place to contain at most `k` elements, always including the last element.
///
/// If `k == 0`, then `xs` is cleared. If `k >= xs.len()`, then `xs` is returned unchanged.
/// Otherwise, a uniformly random sample of `k - 1` of the first `n - 1` elements of `xs` is chosen
/// and retained, and the final element of `xs` is also retained. The relative order of elements of
/// `xs` is unchanged.
///
/// More declaratively: among all subsequences of `xs` of length `min(k, xs.len())` that include
/// the last element, one is selected uniformly at random, and `xs` is updated in place to
/// represent that subsequence.
///
/// The random number generator is initialized with a fixed seed, so this function is
/// deterministic.
pub fn downsample<T>(xs: &mut Vec<T>, k: usize) {
    let n = xs.len();
    if k == 0 {
        xs.clear();
        return;
    }
    if k >= n {
        return;
    }

    let mut rng = ChaCha20Rng::seed_from_u64(0);

    // Choose `k - 1` of the `n - 1` indices to keep, and move their elements into place. Then,
    // move the last element into place and drop extra elements.
    let mut indices = rand::seq::index::sample(&mut rng, n - 1, k - 1).into_vec();
    indices.sort_unstable();
    for (dst, src) in indices.into_iter().enumerate() {
        xs.swap(dst, src);
    }
    xs.swap(k - 1, n - 1);
    xs.truncate(k);
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Clones `xs` and [`downsample`]s the result to `k` elements.
    fn downsample_cloned<T: Clone>(xs: &[T], k: usize) -> Vec<T> {
        let mut ys = Vec::from(xs);
        downsample(&mut ys, k);
        ys
    }

    #[test]
    fn test_deterministic() {
        let xs: Vec<char> = "abcdefg".chars().collect();
        let expected = downsample_cloned(&xs, 4);
        assert_eq!(expected.len(), 4);
        for _ in 0..100 {
            assert_eq!(downsample_cloned(&xs, 4), expected);
        }
    }

    #[test]
    fn test_ok_when_k_greater_than_n() {
        let xs: Vec<char> = "abcdefg".chars().collect();
        assert_eq!(downsample_cloned(&xs, 10), xs);
        assert_eq!(downsample_cloned(&xs, usize::MAX), xs);
    }

    #[test]
    fn test_inorder_plus_last() {
        let xs: Vec<u32> = downsample_cloned(&(0..10000).collect::<Vec<_>>(), 100);
        let mut ys = xs.clone();
        ys.sort_unstable();
        assert_eq!(xs, ys);
        assert_eq!(xs.last(), Some(&9999));
    }

    #[test]
    fn test_zero_k() {
        for n in 0..3 {
            let xs: Vec<u32> = (0..n).collect();
            assert_eq!(downsample_cloned(&xs, 0), Vec::<u32>::new());
        }
    }

    #[test]
    fn test_zero_n() {
        let xs: Vec<u32> = vec![];
        for k in 0..3 {
            assert_eq!(downsample_cloned(&xs, k), Vec::<u32>::new());
        }
    }
}
