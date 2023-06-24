/** The Sampler class takes a {@link RangeGroup} and does some pre-processing to allow fast ordered
 * or random sampling. You provide a number between `[0,1)`, which is mapped to the
 * {@link RangeGroup#size} elements of the group to return a sample. E.g. 0.5 gives you the median
 * element, while 1.0 gives the max. Specifying a random number gives you a random element inside
 * the group. This assumes the {@link RangeGroup} will not be modified, as its internal cache is not
 * updated when the group updates.
 * 
 * Usage:
 * 
 * ```js
 * const s = new Sampler(my_group);
 * const a = s.sample();
 * // or using a custom random generator
 * const b = s.sample(pareto_distribution());
 * ```
 */
class Sampler{
	/** Create a new Sampler
	 * @param {RangeGroup} group the range group whose ranges we should sample from; it should
	 * 	be normalized and non-empty
	 */
	constructor(group){
		/** Range type to use for sampling, taken from the originating {@link RangeGroup}
		 * @type {RangeType}
		 */
		this.type = group.type;
		/** List of pre-processed ranges for fast sampling
		 * @type {{ accum, size, range}}
		 * @private
		 */
		this.ranges = [];

		let accum = 0;
		if (!group.ranges.length)
			throw Error("group must not be empty");
		for (const ref of group.ranges){
			const size = this.type.size(ref);
			if (size <= 0)
				throw Error("range size is not > 0; group must be normalized");
			// each block spans [accum, accum+size)
			const block = { accum, size, ref };
			this.ranges.push(block);
			accum += size;
		}
	}
	/** Draw a sample. This uses binary search (`O(log(N))`) to find an appropriate range,
	 * before calling {@link RangeType.sample} to fetch the actual sample
	 * @param {?number} [i=null] Number between `[0,1)`, representing percentile into the group. If
	 *  null, a uniform random number is generated via `Math.random`. This determines which sample
	 *  should be returned. If not in `[0,1)`, it will be clamped to be so.
	 * @returns {any} randomly drawn sample
	 */
	sample(i=null){
		// TODO: pull out implementation from RangeGroup and reuse? may not be worth it
		if (i === null)
			i = Math.random();
		let range = this.ranges.at(-1);
		// out of bounds?
		if (i <= 0){
			i = 0;
			range = this.ranges[0];
		}
		else if (i >= 1)
			i = 1-Number.EPSILON;
		// search in middle
		else if (this.ranges.length > 1){
			i *= range.accum+range.size;
			let lo = 0;
			let hi = this.ranges.length-1;
			while (lo <= hi){
				const md = (lo+hi) >> 1;
				range = this.ranges[md];
				if (i < range.accum)
					hi = md-1;
				else if (range.accum+range.size <= i)
					lo = md+1;
				else break;	
			}
			// convert i to be relative to range
			i = (i - range.accum)/range.size;
		}
		return this.type.sample(range.ref, i);
	}
}

export default Sampler;