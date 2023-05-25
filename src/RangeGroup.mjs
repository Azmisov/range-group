import { setStart, setEnd } from "./Range.mjs";

/** Comparison modes for two ranges. The enumeration is setup as a bitset, so you
 * can identify which of a/b is start/end:
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
	 * @param {string} label initial value for {@link DiffState#label}
	 */
	constructor(arr, label){
		/** Label for when tracking origin indexes (e.g. "a" or "b")
		 * @type {string}
		 */
		this.label = label;
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
	set_source(obj){
		obj[this.label] = this.idx + this.idx_delta;
	}
}

/** A {@link RangeGroup} holds a list of contiguous ranges, allowing you to perform efficient
 * set operations on them. Create a new RangeGroup like so:
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
 */
class RangeGroup{
	/** Default type to be used if none is provided in the constructor of {@link RangeGroup}
	 * @type {RangeType}
	 * @memberof RangeGroup
	 * @static
	 */
	static default_type;

	/**
	 * @typedef {object} RangeGroupoOptions
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
	 * @param {RangeGroupoOptions} options Options for creation
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
				return this.type.compare(a.start, b.start, a.startExcl, b.startExcl, mode);
			case ComparisonModes.END:
				return this.type.compare(a.end, b.end, a.endExcl, b.endExcl, mode);
			// b optional here
			case ComparisonModes.START_END:
				return this.type.compare(a.start, a.end, a.startExcl, a.endExcl, mode);
			default:
				return this.type.compare(a.end, b.start, a.endExcl, b.startExcl, mode);
		}
	}

	/** Make a copy of this range group
	 * @param {boolean} [deep=true] Whether to make copies of the individual {@link Range}'s as
	 *  well. The set operations and {@link RangeGroup#diff} treat individual {@link Range}'s as
	 *  immutable, so its safe to reuse the objects unless you are modifying them manually.
	 * @returns {RangeGroup}
	 */
	copy(deep=true){
		return deep ? this.ranges.map(this.type.copy) : Array.from(this.ranges);
	}
	/** Puts the range group into a normalized form, where ranges are sorted and self intersections
	 * have been removed. This makes use of {@link RangeGroup#sort} and {@link RangeGroup#self_union}
	 * @returns {RangeGroup} modified `this`
	 */
	normalize(){
		return this.selfUnion(true);
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
	 * @param {boolean} sort whether to call {@link RangeGroup#sort} first; if `false`, the
	 * 	group *MUST* be sorted prior, or this operation will have undefined behavior
	 * @returns {RangeGroup} modified `this`
	 */
	selfUnion(sort=false){
		if (sort)
			this.sort();
		// find first where start <= end
		let i = 0;
		for (; i<this.ranges.length; i++){
			const cur = this.ranges[i];
			if (this.#compare(ComparisonModes.START_END, cur) <= 0)
				break;
		}
		if (i)
			this.ranges = this.ranges.slice(i);
		if (!this.ranges.length)
			return this;
		// we have a valid range to start building from
		let cur = this.ranges[0];
		for (i = 1; i < this.ranges.length;){
			// TODO: could possibly have a "min/max" value in addition to comparator; if cur[1]
			//	equals that maximum, we can discard the remaining ranges
			const nxt = this.ranges[i];
			// end < start; discard this range
			if (this.#compare(ComparisonModes.START_END, nxt) > 0)
				this.ranges.splice(i,1);
			// can combine ranges
			else if (this.#compare(ComparisonModes.END_START, cur, nxt) >= 0){
				// take the greater end
				if (this.#compare(ComparisonModes.END, cur, nxt) < 0)
					cur.end = nxt.end;
				this.ranges.splice(i,1);
			}
			// keep ranges separate
			else{
				i++;
				cur = nxt;
			}
		}
		return this;
	}

	/** Options for calculating diff between two range groups
	 * @typedef {object} DiffOptions
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
	 * @param {RangeGroup} other The group to diff against; this should not equal `this`
	 * @param {DiffOptions} options Options to customize the diff behavior
	 * @returns {RangeGroup | boolean} Contains the diff result range group, which may equal
	 * `this` if `copy` was false. If `bool` was true, a boolean value is instead returned
	 * indicating whether that range group would have been non-empty.
	 */
	diff(other, {filter=false, bool=false, copy=false, track_sources=false, self_union=true}={}){
		/* For diff algorithm comments and design, see diff_algorithm.txt. The actual algorithm is
			not really too complicated, but the logic to handle all the different options ends up
			making it seem complex. The most tricky parts are copy = false (doing in-place
			modifications to this.ranges) and self_union = true (merging adjacent ranges as we go)
		*/
		// will cause problems if !copy; just disallow this
		if (this.ranges === other.ranges)
			throw Error("diff against the same RangeGroup");
		// 001 = a, 010 = b, 100 = ab;
		if (!filter)
			filter = 0b111;
		else{
			if (typeof filter !== "number")
				filter = (filter.ab << 2) | (filter.b << 1) | filter.a;
			if (filter & ~0b111)
				throw Error("filter bits out of range");
		}
		if (self_union){
			track_sources = false;
			// if (!((filter & 0b100) && (filter & 0b11)))
			// 	self_union = false;
		}

		const out = copy && !bool ? new RangeGroup([], {type:this.type, normalize:false}) : this;
		const a = new DiffState(this.ranges, "a");
		const b = new DiffState(other.ranges, "b");
		const state = [a,b];

		/* TODO:
			- setStart({}) -> replace with type-based creation
		*/

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
		 * @param {number} is_b
		 */
		const copy_add = (state, is_b) => {
			let range = state.cur;
			if (copy || is_b){
				range = this.type.copy(range);
				add(range);
			}
			if (track_sources)
				state.set_source(range);
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
						src.set_source(o);
				} while (src.inc() && --count);
			}
			// in-place accept count values of a
			else src.inc(count);
		};
		/** Mark the end of the min range, e.g. no more intersections possible
		 * @param {number} is_b
		 */
		function range_end(is_b){
			const end = state[is_b];
			// aggregate range, or range with trimmed start
			if (extend){
				setEnd(extend, end.cur.end, end.cur.endExcl);
				if (track_sources)
					end.set_source(extend);
				add(extend);
				// old is replaced by the extend copy
				if (!is_b)
					remove();
			}
			// unmodified range
			else{
				copy_add(end, is_b);
			}
		}

		if (a.cur && b.cur){
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
					if (empty && merge_empty){
						// both a/b unfiltered
						if (bool)
							return true;
						if (!extend)
							extend = setStart({}, end.cur.start, end.cur.startExcl);;
						if (!min)
							remove();
					}
					else if ((1 << min) & filter){
						if (bool)
							return true;
						range_end(min);
					}
					else if (!min)
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
					let fmask = (filter & 0b100) >> 1;
					if (start_compare){
						// include start?
						if ((1 << min) & filter){
							fmask |= 0b1;
							if (!self_union || min)
								skip = false;
						}
						else if (!min)
							skip = false;
					}
					if (bool && fmask)
						return true;

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
							fmask |= 0b100;
							if (bool)
								return true;
							if (!self_union || max)
								skip = false;
						}
						else if (!max)
							skip = false;
					}

					if (!skip){
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
							const filter_next = fmask & (smask << 1);
							base = extend;
							if (!base){
								// get x or y's start
								const start_idx = min ^ bit;
								const start = state[start_idx].cur;
								base = setStart({}, start.start, start.startExcl);
								// merge with next segment?
								if (filter_next && self_union){
									extend = base;
									return false;
								}
							}
							// merging with previous segment
							else if (filter_next)
								return false;
							return true;
						}
			
						// x segment (disjoint start)
						if (xy_segment(0)){
							const end = state[min^1].cur;
							setEnd(base, end.start, !end.startExcl);
							if (track_sources)
								state[min].set_source(base);
							add(base);
						}
						// y segment (intersection)
						if (xy_segment(1)){
							const end = state[max^1].cur;
							setEnd(base, end.end, end.endExcl);
							if (track_sources){
								a.set_source(base);
								b.set_source(base);
							}
							add(base);
						}
						// z segment (disjoint end)
						// we never emit here, since its possible there's intersections with subsequent ranges
						if (fmask & 0b100 && !extend){
							const start = state[max^1].cur;
							extend = setStart({}, start.end, !start.endExcl);
							if (track_sources)
								state[max].set_source(extend);
						}
						if (!end_compare || max)
							remove();
					}
					// Catch the case where result is simply a, unmodified
					else if (end_compare <= 0)
						range_end(0);
					
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
		return this.diff(other, {fitler:0b1, bool:true});
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
		if (ar === or)
			return false;
		if (ar.length !== or.length)
			return true;
		for (let i=0; i<ar.length; i++){
			const a = ar[i];
			const b = or[i];
			if (this._compare(ComparisonModes.START, a, b) || this._compare(ComparisonModes.END, a, b))
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


	/** Generator for values within the range group
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
	/** Iterator interface
	 * @see RangeGroup#iterate
	 */
	[Symbol.iterator](){
		return this.iterate();
	}
}
// Method aliases ------------
RangeGroup.add = RangeGroup.union;
RangeGroup.delete = RangeGroup.subtract = RangeGroup.difference;
RangeGroup.isStrictSubset = RangeGroup.isProperSubset;
RangeGroup.isStrictSuperset = RangeGroup.isProperSuperset;

export { RangeGroup, ComparisonModes };