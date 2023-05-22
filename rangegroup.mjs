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

/** Comparison modesComparison types
 * @readonly
 * @enum
 */
const ComparisonModes = {
	/** Comparing the starts of two ranges */
	START: 0,
	/** Comparing the ends of two ranges */
	END: 1,
	/** Comparing the start (a) to the end (b) of a single range */
	START_END: 2,
	/** Comparing the end (a) to the start (b) of two ranges. This compares the gap between two
	 * ranges, and a comparison should resolve to zero if the gap is small enough to merge the
	 * two ranges
	 */
	END_START: 3
};

/** Gets next floating point number;
 * https://stackoverflow.com/a/72185420/379572
 */ 
let _cached_next_after = null;
function createNextAfter(){
	if (!_cached_next_after){
		const f64 = new Float64Array(1)
		const b64 = new BigInt64Array(f64.buffer);
		_cached_next_after = function(start, direction){
			// Branch to descending case first as it is more costly than ascending
			// case due to start != 0.0d conditional.
			if (start > direction) {
				// descending
				if (start !== 0) {
					f64[0] = start;
					const transducer = b64[0];
					b64[0] = transducer + (transducer > 0n ? -1n : 1n);
					return f64[0];
				} else {
					// start == 0.0d && direction < 0.0d
					return -Number.MIN_VALUE;
				}
			} else if (start < direction) {
				// ascending
				// Add +0.0 to get rid of a -0.0 (+0.0 + -0.0 => +0.0)
				// then bitwise convert start to integer.
				f64[0] = start + 0;
				const transducer = b64[0];
				b64[0] = transducer + (transducer >= 0n ? 1n : -1n);
				return f64[0];
			} else if (start == direction) {
				return direction;
			} else {
				// isNaN(start) || isNaN(direction)
				return start + direction;
			}
		}
	}
	return _cached_next_after;
}

/** Generate a comparison function for numbers
 * @param {boolean} [asc=true] ascending sort, or `false` for descending
 * @param {boolean} [nan=false] include logic to place NaN's at end of array (which matches
 *  JavaScript's default `sort` behavior of placing `undefined` at end)
 * @param {boolean | number} [dedekind=false] Since we're dealing with ranges, two ranges should be
 *  combined if there are no numbers in between: e.g. no [Dedekind
 *  cut](https://en.wikipedia.org/wiki/Dedekind_cut) can be performed for that number type. For
 *  integers, you might set this to 1. For floats, set this to some epsilon; otherwise, `true` will
 *  use a special function that detects whether there are no floating point numbers representable
 *  in between. Set to falsey (zero/false) to only return `0` for equality. Note the `dedekind`
 * 	option only takes effect for {@link ComparisonModes.END_START}.
 * @returns {RangeComparison}
 */
function compare_numbers({asc=true, nan=false, dedekind=false}={}){
	const base = asc ? (a,b) => a-b : (a,b) => b-a;
	let ewrap = base;
	if (dedekind){
		if (dedekind === true){
			const next_after = createNextAfter();
			ewrap = (a,b,m) => {
				if (n === ComparisonModes.END_START && next_after(a,b) === b)
					return 0;
				return base(a,b);
			};
		}
		else{
			ewrap = (a,b,m) => {
				if (m === ComparisonModes.END_START && Math.abs(a-b) <= epsilon)
					return 0;
				return base(a,b);
			}
		}
	}
	const nwrap = !nan ? ewrap : (a,b,m) => {
		// always at end, regardless of sort order
		if (isNaN(a)) return 1;
		if (isNaN(b)) return -1;
		return ewrap(a,b,m);
	};
	return nwrap;
}

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


/** Internal state class used in {@link RangeGroup#classify}
 * @private
 */
class ClassifyState{
	/** Create new state object
	 * @param {array} arr ranges array from {@link RangeGroup#ranges}
	 * @param {boolean} is_a whether this is from the "a" or "b" {@link RangeGroup}
	 */
	constructor(arr, is_a){
		/** Bitflags for this state:
		 * 	- 0b1: Whether this is from the "a" or "b" {@link RangeGroup}
		 * -  0b10: Whether cur is a copy
		 * @boolean
		 */
		this.flags = +is_a;
		/** Ranges array from {@link RangeGroup#ranges}
		 * @type {array}
		 */
		this.arr = arr;
		/** Current iterating index into {@link ClassifyState@arr}
		 * @type {number}
		 */
		this.idx = -1;
		/** Reference to `arr[idx]`, possibly a copy with modifications made
		 * @type {array}
		 */
		this.cur = null;
		// initialize
		this.inc();
	}
	/** Update state to next value in range array */
	inc(){
		if (++this.idx < this.arr.length){
			this.cur = this.arr[this.idx];
			this.flags = this.flags & 0b1;
		}
		// end of array
		else this.idx = this.cur = null;
	}
	/** Trim current range's start
	 * @param {any} new_start
	 * @param {boolean} [exclusive=false] whether the new start is exclusive
	 */
	trimStart(new_start, exclusive=false){
		if (!(this.flags & 0b10)){
			this.cur = this.cur.copy();
			this.flags |= 0b10;
		}
		this.cur.start = new_start;
		if (exclusive)
			this.cur.excl |= 0b1;
	}
	/** Make a copy of the current range and trim it's end. Assumes we're going to do a trimStart
	 * or inc call next, so this doesn't modify the current range, only a copy.
	 * @param {any} new_end
	 * @param {boolean} [exclusive=false] whether the new end is exclusive
	 * @returns {Range}
	 */
	trimEnd(new_end, exclusive=false){
		const c = this.cur.copy();
		c.end = new_end;
		if (exclusive)
			c.excl |= 0b10;
	}
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
				this.ranges = ranges.map(v => new this.type(...v));
			// arguments for single range
			else if (!(first instanceof this.type))
				this.ranges = [new this.type(...ranges)];
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
				return this.type.compare(a.start, b.start, mode);
			case ComparisonModes.END:
				return this.type.compare(a.end, b.end, mode);
			// b optional here
			case ComparisonModes.START_END:
				return this.type.compare(a.start, a.end, mode);
			default:
				return this.type.compare(a.end, b.start, mode);
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
		for (let i=0; i<this.ranges.length; i++){
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
	/** Classify the range differences/intersections between this and another {@link RangeGroup}
	 * 	each range will be in form:
	 * 		[start, end, ai, bi]
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
	 * @param {boolean} normalize removes ai/bi indices for ranges
	 * @param {boolean} [self_union=true] run {@link RangeGroup#self_union} on output if needed; e.g.
	 * 	run if filtering by ab+a, ab+b, or ab+a+b (no filter) 
	 * @param {boolean} [bool=false] just return true/false whether or not the filtered output would be
	 * 	non-empty
	 * @returns {RangeGroup | boolean} this contains a new RangeGroup encoding the classified set
	 * 	operation; or if `bool` was true, a boolean value indicating whether that RangeGroup would
	 * 	have been non-empty
	 */
	classify(other, {filter=false, normalize=false, self_union=true, bool=false}={}){
		/* 	- First want to find an intersection. While either a/b's end is below the other's start,
			  we skip to its next range. We could use binary search here.
			- For intersections, there are three parts: disjoint at start, intersection middle, and
			  disjoint at end. The disjoint at the end could have another intersection elsewhere;
			  since ranges are normalized, it is guaranteed the disjoint is the min range.
			- Once we've resolved ranges from one of a/b, we end, possibly adding/removing all
			  remaining elements.

			Ideally we can handle both in-place and copy versions of the same method. Assuming we do
			in-place modification of a, then probably only a/ab+a/ab are efficient operations, with
			ab+b/b possibly requiring lots of copying of b. I think we can implement copy as an
			extra copy whenever we have an in-place value from a, and then do the in-place operation
			on the copy.

			
							
				TODO: what about ]  []  [ case, where individual a couldn't merge, but could merge
					with the added by in the middle
						

		*/
		// 001 = a, 010 = b, 100 = ab;
		if (typeof filter !== "number")
			filter = filter ? (filter.a << 0) | (filter.b << 1) | (filter.ab << 2) : 0b111;
		if (!(filter & 0b111))
			throw Error("filter cannot be empty");
		if (self_union && !((filter & 0b100) && (filter & 0b11)))
			self_union = false;

		const a = new ClassifyState(this.ranges, true);
		const b = new ClassifyState(other.ranges, false);
		const state = [a,b];

		/** Output classified ranges
		 * @type {?RangeGroup}
		 */
		const classified = bool && (new RangeGroup([], {type:this.type}));
		/** Add another range to `classified`, performing filtering and normalization as necessary
		 * @param {ClassifiedState} s state whose
		 * @returns {boolean} same as `bool`, which triggers early stopping
		 */
		const add = (o) => {
			// TODO: have add construct a new Range, instead of in state.inc
			//	also handle self_union here I suppose? or maybe do it in intersection code branch?
			//	or maybe a mix, where we just send a flag saying whether to handle self_union?
			
			
			// discard indices?
			if (normalize)
				r.splice(2,2);
			if (bool)
				return true;
			classified.ranges.push(r);
			return false;
		};

		function setStart(obj, value, excl){
			obj.start = value;
			if (excl)
				obj.startExcl = excl;
			return obj;
		}
		function setEnd(obj, value, excl){
			obj.end = value;
			if (excl)
				obj.endExcl = excl;
			return obj;
		}
		function push(obj){
			// TODO
		}
		let extend = null;


		/** Comparison between a/b range starts
		 * @type {number}
		 */
		let start_compare;
		/** 0/1 index into `state`, indicating whether a/b has the minimum start (equal start = a)
		 * @type {number}
		 */
		let min = null;
		while (true){
			// TODO: end conditions; a/b.cur null
			// see which of a/b comes before
			if (min === null){
				start_compare = this._compare(ComparisonModes.START, a.cur, b.cur);
				min = +(start_compare > 0)
			}
			// check for intersection
			let isect_compare = this._compare(ComparisonModes.END_START, state[min].cur, state[min^1].cur);
			// no intersection
			if (isect_compare < 0){

			}
			// some intersection
			else{
				// same as `start_compare`/`min`, but for maximum end
				const end_compare = this._compare(ComparisonModes.END, a.cur, b.cur);
				const max = +(end_compare > 0);

				let e_mask = 0b000;
				let a_mask = 0b010;
				let b_mask = 0b010;
				let f_mask = (filter & 0b100) >> 1;
				if (start_compare < 0)
					a_mask |= 0b1;
				else if (start_compare > 0)
					b_mask |= 0b1;
				else e_mask |= 0b1;
				if (end_compare > 0)
					a_mask |= 0b100;
				else if (end_compare < 0)
					b_mask |= 0b100;
				else e_mask |= 0b100;
				if (filter & 0b1)
					f_mask |= a_mask & 0b101;
				if (filter & 0b10)
					f_mask |= b_mask & 0b101;


				
				/* TODO:
					no need to modify a in cases:
						b/-b/empty|a|a
						a|a|b/-b/empty
						a|a|a
					still may need to inject b at start/end though
					(a_mask & f_mask) == a_mask could catch this
				*/

				let base;
				/** Gets start of this segment and write to `base`, where start data could come from
				 * a previous segment when merging/extending
				 * @param {number} mask mask for which segment (x/y) this is
				 * @returns {boolean} whether segment should be emitted; false could mean we are
				 * 	merging/extending with the next segment, or this segment is filtered out
				 */
				function xy_segment(mask){
					// this segment is ignored; guaranteed we won't ignore if extend is set
					if (!(filter & mask))
						return false;
					const filter_next = filter & (mask << 1);
					base = extend;
					if (!base){
						// get x or y's start
						const start_idx = ysi ^ (mask & 0b1);
						const start = state[start_idx].cur;
						base = setStart({}, start.start, start.startExcl);
						// merge with next segment?
						if (filter_next && merging){
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
					const end = state[ysi].cur;
					setEnd(base, end.start, !end.startExcl);
					if (track_idx){
						const track = state[ysi^1];
						range[track.label] = track.idx;
					}
					push(base);
				}
				// y segment (intersection)
				if (xy_segment(0b10)){
					const end = state[yei].cur;
					setEnd(base, end.end, end.endExcl);
					if (track_idx){
						range.a = a.idx;
						range.b = b.idx;
					}
					push(base);
				}
				// z segment (disjoint end)
				// we never emit here, since its possible there's intersections with subsequent ranges
				if (filter & 0b100 && !extend){
					const ye = state[yei].cur;
					extend = setStart({}, ye.end, !ye.endExcl);
					if (track_idx){
						const zs = state[yei^1];
						extend[zs.label] = zs.idx;
					}
				}
				// increment a/b

				if (end_compare >= 0) a.inc();
				if (end_compare <= 0) b.inc();
				let min = // something...
				start_compare = end_compare;
			}
		}



              
		while (true){
			/** Indicates which of a/b (index inside `state`) is below/before the other, and so needs
			 * to be incremented to catch up with the other; 2 indicates we found an intersection
			 * @type {number} 
			 */
			let below = 2;
			// end of b
			if (!b.cur){
				// keep going if we need to add a's ranges to classified
				if (!(filter & 0b1) || !a.cur)
					break;
				below = 0;
			}
			// end of a
			else if (!a.cur){
				// keep going if we need to add b's ranges to classified
				if (!(filter & 0b10))
					break;
				below = 1;
			}
			// TODO: could use the max value again here (as mentioned in self_union)
			else if (this._compare(ComparisonModes.END_START, a.cur, b.cur) < 0)
				below = 0;
			else if (this._compare(ComparisonModes.END_START, b.cur, a.cur) < 0)
				below = 1;
			// no intersection
			if (below !== 2){
				const o = state[below];
				if ((1 << below) & filter){
					if (bool) return true;
					// TODO: add o
				}
				o.inc();
			}
			// there is an intersection somewhere
			else{
				if (bool && (0b11 & filter))
					return true;
				// classify the intersections
				let lc = this._compare(ComparisonModes.START, a.cur, b.cur);
				let hc = this._compare(ComparisonModes.END, a.cur, b.cur);

				// handle start first
				/** Which of a/b has greater start */
				let oh = a;
				
				// extract difference at start
				if (lc){
					// which of a/b occupies the starting difference?
					lc = +(lc > 0);
					oh = state[lc ^ 0x1];
					const ol = state[lc];
					const flags = 1 << lc;
					if (flags & filter){
						if (bool) return true;
						// TODO: add ol, with ol.end set to oh.start
						add(ol.start, oh.start, ol.excl | 0b10, flags);
					}
					ol.cur[0] = r[1];
				}
				// a/b starts are equal at this point
				
				// pure intersection
				if (!hc){
					a.cur[3] = b.idx;
					if (0b11 & filter){
						if (bool) return true;
						// TODO: add either a or b
					}
					a.inc();
					b.inc();
				}
				// extract intersection, leaving difference at end for next iteration
				else{
					// which of a/b occupies ending difference?
					hc = +(hc > 0);
					const ol = state[hc], oh = state[hc ^ 0x1];
					const r = ol.cur.slice();
					r[2+(hc ^ 0x1)] = oh.idx;
					if (add(r))
						return true;
					oh.cur[0] = ol.cur[1];
					ol.inc();
					// TODO: we know oh is going to be smaller than ol in next ieration (?)
					// so we can reuse hc as lc for next iter (resets lc if there is fully disjoint in-between)
				}				
			}
		}
		return bool ? false : classified;
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
}

export { RangeGroup, ComparisonModes };