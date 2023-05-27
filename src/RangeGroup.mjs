import { setStart, setEnd } from "./Range.mjs";

/** Comparison modes for two ranges. When comparing two ranges, you can compare any combination of
 * range starts and ends. The enumeration is setup as a bitset, so you can identify which of a/b is
 * start/end:
 * 
 * - bits 0 (LSb) and 1 indicate `a` and `b` respectively
 * - a value of `0` or `1` indicates `start` or `end` of range respectively
 * @readonly
 * @enum
 */
const ComparisonModes = {
	/** Comparing the starts of two ranges
	 * @type {0b00}
	 */
	START: 0b00,
	/** Comparing the ends of two ranges
	 * @type {0b11}
	 */
	END: 0b11,
	/** Comparing the start (`a`) to the end (`b`) of a single range
	 * @type {0b10}
	 */
	START_END: 0b10,
	/** Comparing the end (`a`) to the start (`b`) of two ranges. This compares the gap between two
	 * ranges. If the range type supports merging adjacent ranges, it should return `-0` (negative
	 * zero) if `a` comes before `b` but the gap is zero.
	 * @type {0b01}
	 */
	END_START: 0b01
};

/** Internal state class used in {@link RangeGroup#diff}
 * @private
 */
class DiffState{
	/** Create new state object
	 * @param {array} arr initial value for {@link DiffState#arr}
	 */
	constructor(arr){
		/** Ranges array from {@link RangeGroup#ranges}
		 * @type {array}
		 */
		this.arr = arr;
		/** Current iterating index into {@link DiffState@arr}
		 * @type {number}
		 */
		this.idx = 0;
		/** Change in idx due to modifications to `arr` */
		this.idx_delta = 0;
		/** Reference to `arr[idx]`, possibly a copy with modifications made; falsey if we have
		 * reached the end of the array
		 * @type {?array}
		 */
		this.cur = arr[0];
	}
	/** Update state to next (or subsequent) value in range array
	 * @returns {boolean} whether there was another range
	 */
	inc(count=1){
		this.idx += count
		this.cur = this.arr[this.idx];
		return this.cur !== undefined;
	}
	/** Set range source index to be that of `cur` */
	get_source(){
		return this.idx - this.idx_delta;
	}
}

/** A {@link RangeGroup} holds a list of contiguous ranges, allowing you to perform efficient
 * set operations on them. Create a new `RangeGroup` like so:
 * 
 * ```js
 * // Supply a preconstructed Range object
 * new RangeGroup([{start:0, end:5}])
 * // Arguments to construct ranges
 * new RangeGroup([[0,5]])
 * 
 * // You can also pass a single Range, rather than a list
 * new RangeGroup({start:0, end:5})
 * // Arguments to construct a range
 * new RangeGroup([0,5])
 * // However the following would not be allowed, as it's interpreted as a list of Range's
 * new RangeGroup([new Date(),5])
 * new RangeGroup([["array","arg"],5])
 * ```
 * 
 * A `RangeGroup` must be in *normalized* form before you perform any operations on it. This means
 * its list of ranges are sorted ({@link RangeGroup#sort}) and non-intersecting
 * ({@link RangeGroup#selfUnion}). To make it normalized, call {@link RangeGroup#normalize}, or pass
 * `normalize=true` option for your newly constructed `RangeGroup`. For efficiency, this is not done
 * automatically, as typical inputs are already "pre-normalized". Whenever you modify
 * {@link RangeGroup#ranges} manually, you need to make sure you normalize again (if needed) before
 * calling other methods.
 */
class RangeGroup{
	/** Default type to be used if none is provided in the constructor of {@link RangeGroup}
	 * @type {RangeType}
	 * @memberof RangeGroup
	 * @static
	 */
	static default_type;

	/** Options to pass to the constructor of {@link RangeGroup}
	 * @typedef {object} RangeGroup~CreateOptions
	 * @property {?RangeType} type Range type to be used with this group; if null, it uses
	 * 	{@link RangeGroup.default_type}
	 * @property {boolean} normalize whether to call {@link RangeGroup#normalize} after construction
	 */

	/** Create a new RangeGroup
	 * @param {any} ranges This should be an array containing ranges for the group; each range can be a
	 * preconstructed {@link Range} or an array of arguments to construct one. Any {@link Range}
	 * will be reused, while the containing array is copied.
	 *	
	 * For convenience, you can also pass just a single preconstructed range. You can pass a single
 	 * array of arguments to construct a range as well, but only if the first argument is not an
 	 * object (via `typeof`).
	 * @param {?RangeGroup~CreateOptions} options Options for creation
	 */
	constructor(ranges, {type=null, normalize=false}={}){
		/** Range type to use for this group
		 * @type {RangeType}
		 */
		this.type = type === null ? RangeGroup.default_type : type;
		/** Internal list of ranges
		 * @type {Range[]}
		 */
		this.ranges;

		// single Range
		if (!Array.isArray(ranges))
			this.ranges = [ranges];
		else if (ranges.length){
			const first = ranges[0];
			if (typeof first === "object"){
				// arguments for a list of ranges
				if (Array.isArray(first))
					this.ranges = ranges.map(v => this.type.create(...v));
				// list of Range
				else this.ranges = Array.from(ranges);
			}
			// arguments for single range
			else this.ranges = [this.type.create(...ranges)];
		}
		else this.ranges = [];
		if (normalize)
			this.normalize();
	}

	/** Perform comparison between two ranges
	 * @private
	 * @param {ComparisonModes} mode
	 * @param {Range} a
	 * @param {?Range} b optional for `START_END` mode
	 * @returns {number}
	 */
	#compare(mode, a, b){
		switch (mode){
			case ComparisonModes.START:
				return this.type.compare(mode, a.start, b.start, a.startExcl, b.startExcl);
			case ComparisonModes.END:
				return this.type.compare(mode, a.end, b.end, a.endExcl, b.endExcl);
			// b optional here
			case ComparisonModes.START_END:
				return this.type.compare(mode, a.start, a.end, a.startExcl, a.endExcl);
			default:
				return this.type.compare(mode, a.end, b.start, a.endExcl, b.startExcl);
		}
	}

	/** Make a deep copy of this range group. This calls {@link RangeType#copy} internally
	 * @returns {RangeGroup}
	 */
	copy(){
		const c = new RangeGroup([], {type:this.type});
		c.ranges = this.ranges.map(this.type.copy);
		return c;
	}
	/** Puts the range group into a normalized form, where ranges are sorted and self intersections
	 * have been removed. This calls {@link RangeGroup#sort} and {@link RangeGroup#selfUnion}
	 * @returns {RangeGroup} modified `this`
	 */
	normalize(){
		return this.sort().selfUnion();
	}
	/** Performs an in-place sort of ranges in the group. Ranges are ordered by their start
	 * @returns {RangeGroup} modified `this`
	 */
	sort(){
		// could sort by end as well, giving O(n*log(n)) extra comparisons; however it doesn't help
		// make `self_union` more efficient, as you'd need an additional O(n) comparisons there to
		// handle start equality case
		this.ranges.sort(this.#compare.bind(this, ComparisonModes.START));
		return this;
	}

	/** Union of individual ranges within this range group (e.g. remove self-intersections). This
	 * will remove empty ranges, where the start is after (and not equal) the end.
	 * @returns {RangeGroup} modified `this`
	 */
	selfUnion(){
		// find first where start <= end
		let i = 0;
		for (; i<this.ranges.length; i++){
			const cur = this.ranges[i];
			if (this.#compare(ComparisonModes.START_END, cur) <= 0)
				break;
		}
		if (i){
			// TODO: use slice if this.ranges.length-i < i
			this.ranges.splice(0, i);
		}
		if (!this.ranges.length)
			return this;
		// we have a valid range to start building from
		let cur = this.ranges[0];
		// splice arguments, to reduce calls to splice
		let splice_buffer = null;
		for (i = 1; i < this.ranges.length; i++){
			// TODO: could possibly have a "min/max" value in addition to comparator; if cur[1]
			//	equals that maximum, we can discard the remaining ranges
			const nxt = this.ranges[i];
			// if end < start, discard the empty range
			if (this.#compare(ComparisonModes.START_END, nxt) <= 0){	
				// can combine ranges
				if (this.#compare(ComparisonModes.END_START, cur, nxt) >= 0){
					// take the greater end
					if (this.#compare(ComparisonModes.END, cur, nxt) < 0)
						setEnd(cur, nxt.end, nxt.endExcl);
				}
				// keep ranges separate
				else{
					if (splice_buffer){
						i -= splice_buffer[1];
						this.ranges.splice(...splice_buffer);
						splice_buffer = null;
					}
					cur = nxt;
					continue;
				}
			}
			// buffer deletions
			if (splice_buffer)
				splice_buffer[1]++;
			else splice_buffer = [i,1];
		}
		if (splice_buffer)
			this.ranges.splice(...splice_buffer);
		return this;
	}

	/** Options for calculating diff between two range groups. For use with {@link RangeGroup#diff}
	 * @typedef {object} RangeGroup~DiffOptions
	 * @property {object<string, boolean> | number | false} [filter=false] Specifies what diff
	 *  operations you want to include in the results. Indicate which parts, `a`, `b`, or `ab` to
	 *  include using an object of boolean flags, e.g. `{ab:true, b:true}`. Alternatively, specify a
	 *  bit set of flags, where bits 0 (LSb), 1, and 2 correspond to `a`, `b`, and `ab`
	 *  respectively; e.g. `0b111`.
	 * 
	 *  Setting this to a falsey value (the default) will return all results, e.g.
	 * `{a:true, b:true, ab:true}` or `0b111`;
	 * @property {boolean} [bool=false] Just return true/false whether or not the filtered output would
	 *  be non-empty; when `true`, all remaining options are ignored
	 * @property {boolean} [copy=true] If true, returns the diff results separately, rather than
	 * 	modifying `this` in-place
	 * @property {boolean} [track_sources=false] In the diff output, track where the range came from
	 *  with the keys {@link Range#a} and {@link Range#b}, with values equaling the index into
	 *  `this`/`other` respectively that the range came from. A value of null indicates the range
	 *  was not present in that source. Filtering by nullity gives you the various set operations
	 *  like union or intersection.
	 * @property {boolean} [self_union=true] Merges adjacent ranges, in the same manner as
	 *  {@link RangeGroup#selfUnion}, but using an inline calculation. Use this if you don't care
	 * 	about tracking the specific diff sources/operations, and just want to get the result of the
	 * 	set operationon output if needed. Merging will only occur if filtering by ab+a, ab+b, or
	 *  ab+a+b. The `track_sources` option is disabled if this is true.
	 */

	/** Compute the differences between this and another {@link RangeGroup}. For diff results,
	 * `this` and `other` are referred to as `a` and `b` respectively. There are three different
	 * *operations*, denoted `a`, `b`, and `ab`. They can be understood as:
	 * 
	 * - **a**: values present in `a` but not `b`; set difference "a - b"; deletions from `other`
	 * - **b**: values present in `b` but not `a`; set difference "b - a"; insertions into `other`
	 * - **ab**: values present in both `a` and `b`; set intersection "a ∩ b"
	 * 
	 * Filtering by the various diff operations can give you set operations like union, intersection,
	 * difference, and symmetric difference (see `filter` param). This method is used to implement
	 * nearly all the other operations on {@link RangeGroup}
	 * 
	 * The range group **must** be in normalized form (see {@link RangeGroup#normalize}) prior to
	 * diffing.
	 * 
	 * @param {RangeGroup} other The group to diff against
	 * @param {?RangeGroup~DiffOptions} options Options to customize the diff behavior
	 * @returns {RangeGroup | boolean} Contains the diff result range group, which may equal
	 * `this` if `copy` was false. If `bool` was true, a boolean value is instead returned
	 * indicating whether that range group would have been non-empty.
	 */
	diff(other, {filter=false, bool=false, copy=false, track_sources=false, self_union=true}={}){
		/* For diff algorithm comments and design, see diff_algorithm.txt. The actual algorithm is
			not really too complicated, but the logic to handle all the different options ends up
			making it so. The most tricky parts are copy = false (doing in-place modifications to
			this.ranges) and self_union = true (merging adjacent ranges as we go)
		*/
		// 001 = a, 010 = b, 100 = ab;
		if (!filter)
			filter = 0b111;
		else{
			if (typeof filter !== "number")
				filter = (filter.ab << 2) | (filter.b << 1) | filter.a;
			if (filter & ~0b111)
				throw Error("filter bits out of range");
		}
		// uncommon case, but can cause problems with !copy logic since it assumes a/b are different
		// arrays; can just optimize this case; a/b will be empty, only ab will be present
		if (this.ranges === other.ranges){
			const ab = !!(filter & 0b100);
			if (bool)
				return ab;
			if (ab){
				const out = copy ? this.copy(true) : this;
				if (track_sources){
					for (let i=0; i<out.ranges.length; i++){
						const r = out.ranges[i];
						r.a = r.b = i;
					}
				}
				return out;
			}
			return copy ? this.toCleared() : this.clear();
		}
		if (self_union)
			track_sources = false;

		// iterator for a/b's ranges
		const out = copy && !bool ? new RangeGroup([], {type:this.type, normalize:false}) : this;
		const a = new DiffState(this.ranges);
		const b = new DiffState(other.ranges);
		/** Used to implement logic independent of a/b, where we can fetch one or the other with an
		 * integer: is_b and is_b^1
		 */
		const state = [a,b];

		/** Indicates partial range that we are building/extending/merging
		 * @type {?{start, startExcl, a, b}}
		 */
		let extend = null;
		/** Comparison between a/b range starts
		 * @type {number}
		 */
		let start_compare;
		/** 0/1 index into `state`, indicating whether a/b has the minimum start (equal start = a)
		 * @type {number}
		 */
		let min = null;
		/** Arguments to pass to `a.arr.splice`, for in-place modifications. We buffer the
		 * modifications to reduce the number of splice calls
		 * @type {?Array}
		 */
		let splice_buffer = null;

		/** Flush the current splice buffer */
		const flush = () => {
			const change = splice_buffer.length-2-splice_buffer[1];
			a.idx += change;
			a.idx_delta += change; // cumulative delta
			this.ranges.splice(...splice_buffer);
			splice_buffer = null;
		};
		/** Remove the current A range; only remove A when A will get incremented (e.g. to avoid
		 * double removes, its responsibility of incrementer to remove)
		 */
		function remove(){
			if (copy)
				return;
			// in-place removal;
			if (splice_buffer){
				// extend current splice operation?
				if (splice_buffer[0]+splice_buffer[1] === a.idx){
					splice_buffer[1]++;
					return;
				}
				flush();
			}
			splice_buffer = [a.idx, 1];
		}
		/** Add a newly created range */
		function add(range){
			extend = null;
			if (copy){
				out.ranges.push(range);
				return;
			}
			// in-place insertion
			if (splice_buffer){
				// >=, since we might call remove+add for same index
				if (splice_buffer[0]+splice_buffer[1] >= a.idx){
					splice_buffer.push(range);
					return;
				}
				flush();
			}
			splice_buffer = [a.idx, 0, range];
		}
		/** Copy the range if needed, and add
		 * @param {number} mask first bit used as `is_b` boolean; otherwise mask forwarded to set_sources
		 */
		const copy_add = (state, mask) => {
			let range = state.cur;
			if (copy || mask & 0b1){
				range = this.type.copy(range);
				add(range);
			}
			if (track_sources)
				set_sources(range, mask);
		};
		/** Copy a sequence of ranges if needed, and add
		 * @param {number} count how many to be added
		 * @param {number} is_b
		 */
		const copy_add_many = (count, is_b) => {
			const src = state[is_b];
			let target = null;
			if (copy)
				target = out.ranges;
			else if (is_b){
				// prepare splice_buffer as target when pushing copies of b to a
				prepare: {
					if (splice_buffer){
						if (splice_buffer[0]+splice_buffer[1] === a.idx)
							break prepare;
						flush();
					}
					splice_buffer = [a.idx, 0];
				}
				target = splice_buffer;
			}
			// need to copy or add sources?
			if (target || track_sources){
				do {
					let o = src.cur;
					if (target){
						o = this.type.copy(o);
						target.push(o);
					}
					if (track_sources)
						set_sources(o, is_b);
				} while (src.inc() && --count);
			}
			// in-place accept count values of a
			else src.inc(count);
		};
		/** Mark the end of the min range, e.g. no more intersections possible
		 * @param {number} mask first bit used as `is_b` boolean; otherwise mask forwarded to set_sources
		 */
		function range_end(mask){
			const is_b = mask & 0b1
			const end = state[is_b];
			// aggregate range, or range with trimmed start
			if (extend){
				setEnd(extend, end.cur.end, end.cur.endExcl);
				if (track_sources)
					set_sources(extend, mask);
				add(extend);
				// old is replaced by the extend copy
				if (!is_b)
					remove();
			}
			// unmodified range
			else{
				copy_add(end, mask);
			}
		}
		/** Labels for setting sources */
		const labels = "ab";
		/** Set sources for a range
		 * @param {Range} range
		 * @param {number} mask 0/1 to set a/b respectively, with the other as null; 2 to set 
		 * 	both a and b
		 */
		function set_sources(range, mask){
			if (mask === 2){
				range.a = a.get_source();
				range.b = b.get_source();
			}
			else{
				range[labels.charAt(mask)] = state[mask].get_source();
				range[labels.charAt(mask^1)] = null;
			}
		}

		if (a.cur && b.cur){
			/** Whether to merge adjacent ranges with zero gap between them
			 * @type {boolean}
			 */
			const merge_empty = self_union && (filter & 0b11) == 0b11;
			while (true){
				// see which of a/b comes before
				if (min === null){
					start_compare = this.#compare(ComparisonModes.START, a.cur, b.cur);
					min = +(start_compare > 0);
				}
				// check for intersection
				const middle_compare = this.#compare(ComparisonModes.END_START, state[min].cur, state[min^1].cur);
				const empty = Object.is(middle_compare, -0);
				// no intersection, possibly with empty gap between the ranges
				if (middle_compare < 0 || empty){
					const end = state[min];
					// merge adjacent ranges with no gap
					if (empty && merge_empty){
						// both a/b unfiltered
						if (bool)
							return true;
						if (!extend)
							extend = setStart({}, end.cur.start, end.cur.startExcl);
						if (!min)
							remove();
					}
					else if ((1 << min) & filter){
						if (bool)
							return true;
						range_end(min);
					}
					else if (!bool && !min)
						remove();
					if (!end.inc())
						break;
					if (empty){
						start_compare = -start_compare;
						min ^= 0b1;
					}
					// TODO: binary search first that intersects with state[min^1]
					else min = null;
				}
				// some intersection (or empty gap between two ranges)
				else{
					/** Catches the conditions where we can simply reuse a for the intersection:
					 * 		self_union && a/-b/empty|ab|a/-b/empty
					 * 		!self_union && -b/empty|ab|-b/empty
					 *	Summarized, we check:
					*		- ab not filtered
					*		- a (!min/!max) isn't getting filtered
					*		- no b is included, and additional no a if !self_union
					* @type {boolean}
					*/
					let skip = filter & 0b100;
					/** Which segments are nonempty and filtered in? Bitset form: 0bzyx
					 * @type {number}
					 */
					let fmask = skip >> 1;
					if (bool && fmask)
						return true;

					if (start_compare){
						// include start?
						if ((1 << min) & filter){
							if (bool)
								return true;
							fmask |= 0b1;
							if (!self_union || min)
								skip = false;
						}
						else if (!min)
							skip = false;
					}

					/** Comparison between a/b range ends
					 * @type {number}
					 */
					const end_compare = this.#compare(ComparisonModes.END, a.cur, b.cur);
					/** 0/1 index into `state`, indicating whether a/b has the maximum end (equal end = a)
					 * @type {number}
					 */
					const max = +(end_compare < 0);
					if (end_compare){
						// include end?
						if ((1 << max) & filter){
							if (bool)
								return true
							fmask |= 0b100;
							if (!self_union || max)
								skip = false;
						}
						else if (!max)
							skip = false;
					}

					if (!skip){
						if (fmask){
							let base;
							/** Gets start of this segment and write to `base`, where start data could come from
							 * a previous segment when merging/extending
							 * @param {number} bit mask for which segment (x/y) this is
							 * @returns {boolean} whether segment should be emitted; false could mean we are
							 * 	merging/extending with the next segment, or this segment is filtered out
							 */
							function xy_segment(bit){
								const smask = 1 << bit;
								// this segment is ignored; guaranteed we won't ignore if extend is set
								if (!(fmask & smask))
									return false;
								const merge_next = self_union && fmask & (smask << 1);
								base = extend;
								if (!base){
									// get x or y's start
									const start_idx = min ^ bit;
									const start = state[start_idx].cur;
									base = setStart({}, start.start, start.startExcl);
									// merge with next segment?
									if (merge_next){
										extend = base;
										return false;
									}
								}
								// merging with previous segment; also merge with next segment?
								else if (merge_next)
									return false;
								return true;
							}
				
							// x segment (disjoint start)
							if (xy_segment(0)){
								const end = state[min^1].cur;
								setEnd(base, end.start, !end.startExcl);
								if (track_sources)
									set_sources(base, min);
								add(base);
							}
							// y segment (intersection)
							if (xy_segment(1)){
								const end = state[max^1].cur;
								setEnd(base, end.end, end.endExcl);
								if (track_sources)
									set_sources(base, 2);
								add(base);
							}
							// z segment (disjoint end)
							// we never emit here, since its possible there's intersections with subsequent ranges
							if (fmask & 0b100 && !extend){
								const start = state[max^1].cur;
								extend = setStart({}, start.end, !start.endExcl);
								if (track_sources)
									set_sources(extend, max);
							}
						}
						if (!bool && (!end_compare || max))
							remove();
					}
					// Catch the case where result is simply a, unmodified
					else if (end_compare <= 0){
						// bit zero used for is_b; otherwise, passed to set_sources
						// track_sources needs to set a source for both a and b
						range_end(self_union ? 0 : 2);
					}
					
					// max becomes min for next iter; increment the other range
					if (end_compare){
						if (!state[max^1].inc())
							break;
						start_compare = -end_compare;
						min = max;
					}
					// no z segment (disjoint end); increment both
					else{
						const a_end = a.inc();
						if (!b.inc() || !a_end)
							break;
						min = null;
					}
				}
			}
		}
		// excess remainder
		handle_excess: if (a.cur || b.cur){
			min = b.cur ? 1 : 0;
			const incl = !!(filter & (1 << min));
			if (bool)
				return incl;
			if (incl){
				if (extend){
					range_end(min);
					if (!state[min].inc())
						break handle_excess;
				}
				copy_add_many(Infinity, min);
			}
			// remove remaining from a
			else if (!min && !copy){
				if (splice_buffer){
					if (splice_buffer[0]+splice_buffer[1] === a.idx){
						splice_buffer[1] = Infinity;
						break handle_excess
					}
					flush();
				}
				splice_buffer = [a.idx, Infinity];
			}
		}
		if (bool)
			return false;
		if (splice_buffer)
			flush();
		return out;
	}


	/** Compute the in-place set union between `this` and `other`: `a ∪ b`. This uses
	 * {@link RangeGroup#diff} internally
	 * @param {RangeGroup} other
	 * @returns {RangeGroup} modified `this`
	 */
	union(other){
		return this.diff(other);
	}
	/** Compute the in-place set intersection between `this` and `other`: `a ∩ b`. This uses
	 * {@link RangeGroup#diff} internally
	 * @param {RangeGroup} other
	 * @returns {RangeGroup} modified `this`
	 */
	intersect(other){
		return this.diff(other, {filter:0b100});
	}
	/** Compute the in-place set difference between `this` and `other`: `a - b`. This uses
	 * {@link RangeGroup#diff} internally
	 * @param {RangeGroup} other
	 * @returns {RangeGroup} modified `this`
	 */
	difference(other){
		return this.diff(other, {filter:0b1});
	}
	/** Compute the in-place set symmetric difference between `this` and `other`: `a Δ b`. This uses
	 * {@link RangeGroup#diff} internally
	 * @param {RangeGroup} other
	 * @returns {RangeGroup} modified `this`
	 */
	symmetricDifference(other){
		return this.diff(other, {filter:0b11});
	}
	/** Remove all elements from this group
	 * @returns {RangeGroup} modified `this`
	 */
	clear(){
		this.ranges = [];
		return this;
	}


	/** Same as {@link RangeGroup#union}, but returning a copy instead of modifying
	 * 	the range group in-place
	 * @param {RangeGroup} other
	 * @returns {RangeGroup} new group containing the union
	 */
	toUnioned(other){
		return this.diff(other, {copy:true});
	}
	/** Same as {@link RangeGroup#intersect}, but returning a copy instead of modifying
	 * 	the range group in-place
	 * @param {RangeGroup} other
	 * @returns {RangeGroup} new group containing the intersection
	 */
	toIntersected(other){
		return this.diff(other, {filter:0b100, copy:true});
	}
	/** Same as {@link RangeGroup#difference}, but returning a copy instead of modifying
	 * 	the range group in-place
	 * @param {RangeGroup} other
	 * @returns {RangeGroup} new group containing the difference
	 */
	toDifferenced(other){
		return this.diff(other, {filter:0b1, copy:true});
	}
	/** Same as {@link RangeGroup#symmetricDifference}, but returning a copy instead of modifying
	 * 	the range group in-place
	 * @param {RangeGroup} other
	 * @returns {RangeGroup} new group containing the symmetric difference
	 */
	toSymmetricDifferenced(other){
		return this.diff(other, {filter:0b11, copy:true});
	}
	/** Same as {@link RangeGroup#clear}, but returns a copy that is cleared. This is functionally
	 * equivalent to creating a new range group with the same type
	 * @returns {RangeGroup}
	 */
	toCleared(){
		return new RangeGroup([], {type: this.type});
	}


	/** Check if a union of `this` and `other` would be non-empty: `a ∪ b`.
	 * @param {RangeGroup} other
	 * @returns {boolean}
	 */
	hasUnion(other){
		// no need to use diff here, since result is trivial
		return !this.isEmpty() || !other.isEmpty();
	}
	/** Check if `this` intersects with `other`: `a ∩ b`. This uses {@link RangeGroup#diff}
	 * internally
	 * @param {RangeGroup} other
	 * @returns {boolean}
	 */
	hasIntersection(other){
		return this.diff(other, {filter:0b100, bool:true});
	}
	/** Check if `this` has values not present in `other`: `a - b`. This uses
	 * {@link RangeGroup#diff} internally
	 * @param {RangeGroup} other
	 * @returns {boolean}
	 */
	hasDifference(other){
		return this.diff(other, {filter:0b1, bool:true});
	}
	/** Check if `this` has values not present in `other`: `a - b`. This uses
	 * {@link RangeGroup#diff} internally
	 * @param {RangeGroup} other
	 * @returns {boolean}
	 */
	hasSymmetricDifference(other){
		// can do an optimized version here pretty easily
		const ar = this.ranges;
		const or = other.ranges;
		// we allow this here, since it will get used with isEqual
		if (ar === or)
			return false;
		if (ar.length !== or.length)
			return true;
		for (let i=0; i<ar.length; i++){
			const a = ar[i];
			const b = or[i];
			if (this.#compare(ComparisonModes.START, a, b) || this.#compare(ComparisonModes.END, a, b))
				return true;
		}
		return false;
	}


	/** Check if `this` and `other` range groups are equal, meaning they have identical elements:
	 * `a = b`. This uses {@link RangeGroup#hasSymmetricDifference} internally, returning its
	 * negated value
	 * @param {RangeGroup} other
	 * @returns {boolean} true if equal
	 */
	isEqual(other){ return !this.hasSymmetricDifference(other); }
	/** Check if this range group is empty, meaning there are no elements: `a = ∅`
	 * @returns {boolean} true if empty
	 */
	isEmpty(){ return !this.ranges.length; }
	/** Check whether `this` is a subset of `other`, meaning all of its elements are also in
	 * `other`: `a ⊆ b`. This uses {@link RangeGroup#hasDifference} internally, returning its
	 * negated value
	 * @param {RangeGroup} other
	 * @returns {boolean} true if a subset
	 */
	isSubset(other){ return !this.hasDifference(other); }
	/** Check whether `this` is a proper/strict subset of `other`, meaning all of its elements are
	 * in `other`, but does not have all the elements of `other`: `a ⊂ b`. This uses two calls to
	 * {@link RangeGroup#hasDifference} internally
	 * @param {RangeGroup} other
	 * @returns {boolean} true if a proper/strict subset
	 */
	isProperSubset(other){
		/* TODO: this could be more efficient; essentially want to compute symmetric difference,
			where we return false immediately when we encounter an 'a'; and we keep a bool flag
			as we go whether or not we saw 'b'; bool flag gets returned if we get to the end
		*/
		return !this.hasDifference(other) && other.hasDifference(this);
	}
	/** Check whether `this` is a superset of `other`, meaning all `other` elements are also in
	 * `this`: `a ⊇ b`. This is equivalent to `other.isSubset(this)`
	 * @see RangeGroup#isSubset
	 * @param {RangeGroup} other
	 * @returns {boolean} true if a superset
	 */
	isSuperset(other){
		return other.isSubset(this);
	}
	/** Check whether `this` is a proper/strict superset of `other`, meaning all `other` elements are also in
	 * `this`: `a ⊃ b`. This is equivalent to `other.isProperSubset(this)`
	 * @see RangeGroup#isProperSubset
	 * @param {RangeGroup} other
	 * @returns {boolean} true if a proper/strict superset
	 */
	isProperSuperset(other){
		return other.isProperSubset(this);
	}

	/** Get the total number of elements held by this group. This dynamically sums up the size of
	 * each range in the group, so it is not a constant-time operation. To see how many contiguous
	 * ranges there are, just get the length of {@link RangeGroup#ranges}.
	 * @returns {number}
	 */
	size(){
		let s = 0;
		for (const r of this.ranges)
			s += this.type.size(r);
		return s;
	}

	/** Output of {@link RangeGroup#search}
	 * @typedef {object} RangeGroup~SearchResult
	 * @prop {number} index Lower bound index; the position where `element` could be inserted to
	 * 	keep ranges sorted, or the range that contains `element`
	 * @prop {boolean} has Whether the range at `index` contains the element already
	 */

	/** Find the position in {@link RangeGroup#ranges} where `element` could be inserted to
	 * maintain a sorted array. If the element belongs to a range already, then the index to
	 * that range would be returned, with `has` flag set. In other words, the index is the *lower
	 * bound*: the first position that does not come before `element`.
	 * @param {any} element the element to search for
	 * @param {number} first Inclusive lower bound into {@link RangeGroup#ranges} for the search. If
	 *  less than zero, zero is used.
	 * @param {number} last Inclusive upper bound into {@link RangeGroup#ranges} for the search. A
	 *  negative value counts from the end, e.g. `-1` is equivalent to `this.ranges.length-1`. If
	 *  beyond the end of the array, the last index of the array is used.
	 * @returns {RangeGroup~SearchResult}
	 */
	search(element, first=0, last=-1){
		// fix bounds
		const l = this.ranges.length;
		if (first < 0)
			first = 0;
		if (last < 0)
			last = Math.max(-1,l+last);
		else if (last >= l)
			last = l-1;		
		if (first > last)
			return {index:last+1, has:false};

		let fel = this.ranges[first];
		let lel = this.ranges[last];

		// at start of each loop iter, element needs to be inside [first.start, last.end]
		let t = this.type.interpolate(element, fel.start, lel.end, fel.startExcl, lel.endExcl);
		if (t < 0)
			return {index:first, has:false};
		if (t > 1)
			return {index:last+1, has:false};

		while (true) {
			// make range exclusive: (first.start, last.end)
			if (first === last || t === 0)
				return {index: first, has:true};
			if (t === 1)
				return {index: last, has:true};

			/* Get estimated index where a match would be found. We are using interpolation search,
				but it reduces to binary search if `interpolate` always returns 0.5. We are dealing
				with ranges not single points, so it is slightly different. Assume evenly
				distributed ranges, meaning gaps are always the same.
				- zero gap: floor(t*(last-first+1)) will be inside the correct range
				- maximal gap (reducing to single points): round(t*(last-first)) gives the closest
				Floor will be accurate for zero gap + 50% of maximal gap, so let's go with that
			*/
			const middle = first + Math.floor(t*(last-first)+t);
			// console.log(first, middle, last, t);
			const mel = this.ranges[middle];

			// TODO: middle == first or last
			const start_compare = this.type.compare(ComparisonModes.START, mel.start, element, mel.startExcl);
			// inside (middle.start, last.end)
			if (start_compare < 0){
				const end_compare = this.type.compare(ComparisonModes.END, mel.end, element, mel.endExcl);
				// inside (middle.end, last.end)
				if (end_compare < 0){
					first = middle+1;
					fel = this.ranges[first];
					t = this.type.interpolate(element, fel.start, lel.end, fel.startExcl, lel.endExcl);
					if (t < 0)
						return {index:first, has:false};
					continue;
				}
			}
			// inside (first.start, middle.start)
			else if (start_compare > 0){
				last = middle-1;
				lel = this.ranges[last];
				t = this.type.interpolate(element, fel.start, lel.end, fel.startExcl, lel.endExcl);
				if (t > 1)
					return {index:last+1, has:false};
				continue;
			}
			// inside [middle.start, middle.end]
			return {index:middle, has:true};
		}
	}
	/** Test whether an element is contained in this group. This uses {@link RangeGroup#search}
	 * internally, returning {@link RangeGroup~SearchResult#has}.
	 * @param {any} element the element to search for
	 * @param {number} first lower bound into {@link RangeGroup#ranges} for the search
	 * @param {number} last upper bound into {@link RangeGroup#ranges} for the search; a negative
	 * 	value counts from the end, e.g. `-1` is equivalent to `this.ranges.length-1`
	 * @returns {boolean}
	 */
	has(element, first=0, last=-1){
		return this.search(element, first, last).has;
	}

	/** Generator for values within the range group. This calls {@link RangeType#iterate} internally
	 * @param {boolean} forward iterate ranges forward or backward; forward indicates the first
	 *  value will give a negative comparison against any subsequent values
	 * @param {...any} args arguments to forward to the type's iterator
	 * @yields {any} values from the range
	 */
	*iterate(forward=true, ...args){
		let i, end, inc;
		if (forward){
			i = 0;
			end = this.ranges.length;
			inc = 1;
		}
		else{
			i = this.ranges.length - 1;
			end = inc = -1;
		}
		for (; i != end; i += inc){
			const r = this.ranges[i];
			yield* this.type.iterate(r, forward, ...args);
		}
	}
	/** Iterator interface, allowing use with things like for-of loops or `Array.from`. To
	 * customize how the values are iterated, pass arguments to {@link RangeGroup#iterate} instead.
	 * @function
	 * @name RangeGroup#@@iterator
	 * @see RangeGroup#iterate
	 */
	[Symbol.iterator](){
		return this.iterate();
	}
}
// Method aliases -------------------------------------
const aliases = {
	add: "union",
	subtract: "difference",
	delete: "difference",
	isStrictSubset: "isProperSubset",
	isStrictSuperset: "isProperSuperset",
	cardinality: "size",
	contains: "has",
};
for (const alias in aliases)
	RangeGroup.prototype[alias] = RangeGroup.prototype[aliases[alias]];

/** An alias for {@link RangeGroup#union}
 * @name RangeGroup#add
 * @function 
 */
/** An alias for {@link RangeGroup#difference}
 * @name RangeGroup#delete
 * @function 
 */
/** An alias for {@link RangeGroup#difference}
 * @name RangeGroup#subtract
 * @function 
 */
/** An alias for {@link RangeGroup#isProperSubset}
 * @name RangeGroup#isStrictSubset
 * @function 
 */
/** An alias for {@link RangeGroup#isProperSuperset}
 * @name RangeGroup#isStrictSuperset
 * @function 
 */
/** An alias for {@link RangeGroup#size}
 * @name RangeGroup#cardinality
 * @function 
 */
/** An alias for {@link RangeGroup#has}
 * @name RangeGroup#contains
 * @function
 */

export { RangeGroup, ComparisonModes };