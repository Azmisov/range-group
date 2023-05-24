/////////// RANGE INTERFACE ////////////////
/**
 * Range interface for use with {@link RangeGroup}
 * @interface Range
 */
/**
 * Start of range
 * @var
 * @name Range#start
 */
/**
 * End of range
 * @var
 * @name Range#end
 */
/**
 * Optional bitflag indicating whether start/end are exclusive
 * @var
 * @name Range#excl
 * @type {?number} 
 */
/**
 * Indicates the index from {@link RangeGroup} 'a', for which this range was sourced from during
 * a boolean set operation; null if the range came from 'b'
 * @var
 * @name Range#a
 * @type {?number}
 */
/**
 * Indicates the index from {@link RangeGroup} 'b', for which this range was sourced from during
 * a boolean set operation; null if the range came from 'a'
 * @var
 * @name Range#b
 * @type {?number}
 */
/**
 * Compares the start/end of two ranges
 * @function
 * @static
 * @name Range.compare
 * @param {any} a Range start/end to compare with
 * @param {any} b Range start/end to compare with
 * @param {ComparisonModes} mode what kind of combination of start/end is being compared
 * @returns {number} -1 if a comes before b, 1 if a comes after b, or 0 if they are equal; for
 * 	`END_START` comparisons you may return 0 if there is no gap between the two ranges
 */
/**
 * Iterate all values inside the range
 * @function
 * @name Range#iterate
 * @param {...any} args arguments to customize iteration
 * @returns {iterable} can return a generator, or some other iterable that can be used in a for loop
 */

/** Comparison modes for two ranges. The enumeration is setup as a bitset, so you
 * can identify which of a/b is start/end:
 * 	- bits 0/1 indicate a/b respectively
 * 	- a value of 0/1 indicates start/end of range respectively
 * @readonly
 * @enum
 */
const ComparisonModes = {
	/** Comparing the starts of two ranges */
	START: 0b00,
	/** Comparing the ends of two ranges */
	END: 0b11,
	/** Comparing the start (a) to the end (b) of a single range */
	START_END: 0b10,
	/** Comparing the end (a) to the start (b) of two ranges. This compares the gap between two
	 * ranges, and a comparison should resolve to zero if the gap is small enough to merge the
	 * two ranges
	 */
	END_START: 0b01
};

/** Generate a comparison function that matches the default behavior of Javascript `sort`
 * @param {boolean} [asc=true] ascending sort, or `false` for descending
 * @returns {RangeComparison}
 */
function compare_default({asc=true}={}){
	const ret = asc ? -1 : 1;
	return (a,b) => {
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#description
		if (a === undefined)
			return 1;
		if (b === undefined)
			return -1;
		a = String(a);
		b = String(b);
		if (a < b) ret;
		if (a > b) -ret;
		return 0;
	}
}


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
		// initialize
		this.inc();
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

/** Set range start */
function setStart(obj, value, excl){
	obj.start = value;
	if (excl)
		obj.startExcl = excl;
	return obj;
}
/** Set range end */
function setEnd(obj, value, excl){
	obj.end = value;
	if (excl)
		obj.endExcl = excl;
	return obj;
}

class RangeGroup{
	static default_type;
	/** Create a new RangeGroup
	 * @param ranges Can be a single {@link Range} or an array of arguments to construct one; or it
	 *  can be a list of {@link Range} or arrays arguments to construct them
	 * @param {?Range} type Range type to be used with this group; if null, it uses
	 * 	{@link RangeGroup.default_type}
	 * @param {boolean} normalize whether to call {@link RangeGroup#normalize} after construction
	 */
	constructor(ranges, {type=null, normalize=false}={}){
		/** Range type to use for this group
		 * @type {Range}
		 */
		this.type = type === null ? RangeGroup.default_type : type;
		/** Internal list of ranges
		 * @type {Range[]}
		 */
		this.ranges = ranges
		// single predefined range
		if (!Array.isArray(ranges))
			this.ranges = [ranges];
		else if (ranges.length){
			const first = ranges[0];
			// arguments for a list of ranges
			if (Array.isArray(first))
				this.ranges = ranges.map(v => this.type.create(...v));
			// arguments for single range
			else if (!(first instanceof this.type))
				this.ranges = [this.type.create(...ranges)];
		}
		if (normalize)
			this.normalize();
	}
	/** Perform comparison between two ranges
	 * @param {ComparisonModes} mode
	 * @param {Range} a
	 * @param {?Range} b optional for `START_END` mode
	 */
	_compare(mode, a, b){
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
	/** Puts the range group into a normalized form, where ranges are sorted and self intersections
	 * have been removed. This makes use of {@link RangeGroup#sort} and {@link RangeGroup#self_union}
	 * @returns {RangeGroup} modified `this`
	 */
	normalize(){
		this.sort();
		this.self_union();
		return this;
	}
	/** Performs an in-place sort of ranges in the group. Ranges are ordered by their start
	 * @returns {RangeGroup} modified `this`
	 */
	sort(){
		// could sort by end as well, giving O(n*log(n)) extra comparisons; however it doesn't help
		// make `self_union` more efficient, as you'd need an additional O(n) comparisons there to
		// handle start equality case
		this.ranges.sort(this._compare.bind(this, ComparisonModes.START));
		return this;
	}
	/** Union of individual ranges within this range group (e.g. remove self-intersections). This
	 * will remove empty ranges, where the start is after (and not equal) the end.
	 * @param {boolean} sort whether to call {@link RangeGroup#sort} first; if `false`, the
	 * 	group *MUST* be sorted prior, or this operation will have undefined behavior
	 * @returns {RangeGroup} modified `this`
	 */
	self_union(sort=false){
		if (sort)
			this.sort();
		// find first where start <= end
		let i = 0;
		for (; i<this.ranges.length; i++){
			const cur = this.ranges[i];
			if (this._compare(ComparisonModes.START_END, cur) <= 0)
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
			if (this._compare(ComparisonModes.START_END, nxt) > 0)
				this.ranges.splice(i,1);
			// can combine ranges
			else if (this._compare(ComparisonModes.END_START, cur, nxt) >= 0){
				// take the greater end
				if (this._compare(ComparisonModes.END, cur, nxt) < 0)
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

	/** Compute the differences between this and another {@link RangeGroup}
	 * 	- ai null: b-a
	 *  - bi null: a-b
	 *  - neither ai/bi null: a intersect b
	 * Filtering by ai/bi nullity will give you the various set operations.
	 * 
	 * I will use this as the basis for individual set ops, rather than coding
	 * each set op individually (so simpler code at expense of some overhead for each op).
	 * 
	 * @param {object | number | false} filter an object of boolean flags `{ab, a, b}`, used to
	 * filter ranges occupied by a or b:
	 * 
	 * 		- `ab`: a/b both non-null; "a intersect b"
	 * 		- `a`: a non-null, b null; "a-b"
	 * 		- `b`: a null, b non-null; "b-a"
	 * 
	 * 	If you set all to true, you get the union of a/b; a falsey filter defaults to this. You can
	 * 	also set this to a bitflag, where a, b, ab indicate the first three bits in that order.
	 * @param {boolean} [track_sources=false] in the diff output, track where the range came from
	 *  with the keys a/b, with values equaling the index into this/other respectively that the
	 *  range came from; tracking is disabled when `self_union` is true, as the resultant merges
	 *  will taint the range sources
	 * @param {boolean} [self_union=true] run {@link RangeGroup#self_union} on output if needed; e.g.
	 * 	run if filtering by ab+a, ab+b, or ab+a+b (no filter) 
	 * @param {boolean} [copy=true] if true, returns the diff results separately, rather than
	 * 	modifying `this` in-place
	 * @param {boolean} [bool=false] just return true/false whether or not the filtered output would be
	 * 	non-empty
	 * @returns {RangeGroup | boolean} this contains the diff result range group, which may equal
	 * `this` if `copy` was false; if `bool` was true, a boolean value is instead returned
	 * indicating whether the range group would have been non-empty
	 */
	diff(other, {filter=false, track_sources=false, self_union=true, copy=false, bool=false}={}){
		// for diff algorithm comments and design, see diff_algorithm.txt
		// 001 = a, 010 = b, 100 = ab;
		if (typeof filter !== "number")
			filter = filter ? (filter.a << 0) | (filter.b << 1) | (filter.ab << 2) : 0b111;
		if (!(filter & 0b111))
			throw Error("filter cannot be empty");
		if (self_union){
			track_sources = false;
			// if (!((filter & 0b100) && (filter & 0b11)))
			// 	self_union = false;
		}		

		const out = copy ? new RangeGroup([], {type:this.type, normalize:false}) : this;
		const a = new DiffState(this.ranges, "a");
		const b = new DiffState(other.ranges, "b");
		const state = [a,b];

		/* TODO:
			- end conditions; a/b.cur null
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
		function flush(){
			a.idx_delta += splice_buffer.length-2-splice_buffer[1];
			this.ranges.splice(...splice_buffer);
			splice_buffer = null;
		}
		/** Remove the current a range */
		function remove(){
			if (copy)
				return;
			// in-place removal;
			// extend current splice operation?
			if (splice_buffer){
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
				if (splice_buffer[0]+splice_buffer[1] === a.idx){
					splice_buffer.push(range);
					return;
				}
				flush();
			}
			splice_buffer = [a.idx, 0, range];
		}
		/** Copy the range if needed, and add */
		function copy_add(state, is_a){
			let range = state.cur;
			const should_copy = copy || !is_a;
			if (should_copy)
				range = this.type.copy(range);
			if (track_sources)
				state.set_source(range);
			if (should_copy)
				add(range);
		}
		/** Copy a sequence of ranges if needed, and add */
		function copy_add_many(count, is_b){
			const src = state[+is_b];
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
		}
		/** Mark the end of the min range, e.g. no more intersections possible */
		function range_end(){
			const end = state[min];
			// aggregate range, or range with trimmed start
			if (extend){
				setEnd(extend, end.cur.end, end.cur.endExcl);
				if (track_sources)
					end.set_source(extend);
				add(extend);
			}
			// unmodified range
			else{
				copy_add(end, !min);
			}
		}

		if (a.cur && b.cur){
			while (true){
				// see which of a/b comes before
				if (min === null){
					start_compare = this._compare(ComparisonModes.START, a.cur, b.cur);
					min = +(start_compare > 0)
				}
				// check for intersection
				const middle_compare = this._compare(ComparisonModes.END_START, state[min].cur, state[min^1].cur);
				// no intersection
				if (middle_compare < 0){
					const end = state[min];
					if ((1 << min) & filter){
						if (bool)
							return true;
						range_end();
					}
					if (!end.inc())
						break;
					// TODO: binary search first that intersects with state[min^1]
					min = null;
				}
				// some intersection
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
					let skip = filter & 0b10;
					/** Which segments are nonempty and filtered in? Bitset form: 0bzyx
					 * @type {number}
					 */
					const fmask = (filter & 0b100) >> 1;
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
					const end_compare = this._compare(ComparisonModes.END, a.cur, b.cur);
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

					// Catch the case where result is simply a, unmodified
					if (skip){
						if (extend)
							remove();
						if (!end_compare)
							range_end();
					}
					else{
						remove();
						let base;
						/** Gets start of this segment and write to `base`, where start data could come from
						 * a previous segment when merging/extending
						 * @param {number} smask mask for which segment (x/y) this is
						 * @returns {boolean} whether segment should be emitted; false could mean we are
						 * 	merging/extending with the next segment, or this segment is filtered out
						 */
						function xy_segment(smask){
							// this segment is ignored; guaranteed we won't ignore if extend is set
							if (!(fmask & smask))
								return false;
							const filter_next = fmask & (smask << 1);
							base = extend;
							if (!base){
								// get x or y's start
								const start_idx = min;
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
						if (xy_segment(0b1)){
							const end = state[min^1].cur;
							setEnd(base, end.start, !end.startExcl);
							if (track_sources)
								state[min].set_source(base);
							add(base);
						}
						// y segment (intersection)
						if (xy_segment(0b10)){
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
					}
					
					// max becomes min for next iter; increment the other range
					if (end_compare){
						if (!state[max^1].inc())
							break;
						start_compare = end_compare;
						min = max;
					}
					// no z segment (disjoint end); increment both
					else{
						if (!a.inc() || !b.inc())
							break;
						min = null;
					}
				}
			}
		}
		// excess remainder
		handle_excess: if (a.cur || b.cur){
			const excess = b.cur ? 1 : 0;
			if (filter & (1 << excess)){
				if (extend){
					range_end();
					if (!state[excess].inc())
						break handle_excess;
				}
			}
			copy_add_many(Infinity, excess);
		}
		if (splice_buffer)
			flush();

		return bool ? false : out;
	}

	/** intersection of two normalized lists */
	intersect(other, {normalize=false, bool=false}={}){
		return this.classify(other, {filter: {ab:true}, normalize, bool});
	}
	/** difference of normalized list a w/ normalized list b */
	difference(other, {normalize=false, bool=false}={}){
		return this.classify(other, {filter: {a:true}, normalize, bool});
	}
	/** symmetric difference of two normalized lists */
	symmetric_difference(other, {normalize=false, bool=false}={}){
		return this.classify(other, {filter: {a:true, b:true}, normalize, bool});
	}
	/** union of two normalized lists (not in-place) */
	union(other, {normalize=false, bool=false}={}){
		return this.classify(other, {normalize, bool});
	}

	/** Generator for values within the range group
	 * @param {boolean} forward iterate ranges forward or backward; forward indicates the first
	 *  value will give a negative comparison against any subsequent values
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
}

export { RangeGroup, ComparisonModes };