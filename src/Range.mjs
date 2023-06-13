// This file mainly just holds range interface definition

/** Interface that all Range objects must implement
 * @interface Range
 */
/** Start of range
 * @name Range#start
 * @type {any}
 */
/** End of range
 * @name Range#end
 * @type {any}
 */
/** Whether {@link Range#start} is exclusive; if undefined or null, it defaults to inclusive
 * @name Range#startExcl
 * @type {?boolean}
 */
/** Whether {@link Range#end} is exclusive; if undefined or null, it defaults to inclusive
 * @name Range#endExcl
 * @type {?boolean}
 */
/** Indicates the index into {@link RangeGroup#ranges}, for which this range was sourced from during
 * a boolean set operation. This is set from {@link RangeGroup#diff} if the `track_sources` option
 * is enabled. A value of `null` indicates the range was not present in group `a`.
 * @name Range#a
 * @type {?number} 
 */
/** Indicates the index into {@link RangeGroup#ranges}, for which this range was sourced from during
 * a boolean set operation. This is set from {@link RangeGroup#diff} if the `track_sources` option
 * is enabled. A value of `null` indicates the range was not present in group `b`.
 * @name Range#b
 * @type {?number} 
 */


/** Generic range type interface for use with {@link RangeGroup}. This provides all the definitions
 * for creating and manipulating a {@link Range}. An important design choice was to allow ranges to
 * be defined with plain JSON objects. Because of this, {@link RangeType} provide a C-like interface
 * for performing operations on those objects, rather than forcing a class based design. You can
 * still use a class to implement a particular type of {@link Range}; if going that route, you'll
 * supply a supplementary {@link RangeType} to {@link RangeGroup}, where you are simply calling the
 * class methods.
 * @interface RangeType
 */
// TODO: maybe have create perform this.copy(args[0]) if only one argument?
/** Create a new {@link Range} object. If no arguments are passed, an empty/default range should
 * be created. Otherwise, a new range should be initialized using the arguments passed. The form
 * of these arguments is up to the {@link RangeType}.
 * @function
 * @static
 * @name RangeType.create
 * @param {...any} args arguments to initialize the range
 * @returns {Range} the newly created range
 */
/** Copy a {@link Range} of this {@link RangeType}
 * @function
 * @static
 * @name RangeType.copy
 * @param {Range} range the range to be copied
 * @returns {Range} copied range
 */
/** Return the size, or cardinality of this range. This is called by {@link RangeGroup#size}
 * @function
 * @static
 * @name RangeType.size
 * @param {Range} range the range to retrieve the size of
 * @returns {number} the range size
 */
/** Result of {@link RangeType.compare}
 * @typedef {object} RangeType~CompareResult
 * @prop {number} distance The signed distance between `a` and `b`. For continuous domains, this is
 *  a traditional distance measure, e.g. `a - b` for numbers. For discrete domains, it should
 *  measure the number of elements **in between** `a` and `b`; e.g. for integers, the distance
 *  between 3 and 5 is 1, since only one integer, 4, is between.
 * 
 * The `distance` is used for several things:
 * 1. To merge adjacent ranges if the distance (or gap) between them is zero. For example, the
 *    integer ranges `[0,2] [3,5]` or floating point ranges `[0,3) [3,5]` could be merged as
 *    `[0,5]`. Another case might be, `[-2,-0] [+0,3]` which can be merged as `[-2,3]`.
 * 2. To perform interpolation search in {@link RangeGroup#search}. You can opt-out of interpolation
 *    search by returning the sign of distance (-1, 0, or +1); this causes the search to reduce
 *    to binary search instead. See {@link CommonType.compareBinarySearch} for a decorator which
 *    does this.
 * @prop {number} side One of the following:
 * - `-1`: `a` comes before `b`
 * - `0`: `a` equals `b` exactly; signed zero `-0` is also fine here
 * - `1`: `a` comes after `b`
 */
/** Compares two start/end boundaries.
 * 
 * The comparison function should return a tuple, which is a little different than what you might
 * use with `Array.prototype.sort`. This is to allow proper handling of exclusive bounds. As an
 * example, consider the gap between ranges `[0,5) [5,10]`: the distance between the ranges is
 * infinitely small, but not quite equal. So in this case, the compare function returns
 * `{distance:0, side:-1}`, to indicate zero gap approaching from the left. See
 * {@link RangeType~CompareResult} for more details.
 * @function
 * @static
 * @name RangeType.compare
 * @param {ComparisonModes} mode What combination of range starts/ends is being compared. See
 * 	documentation for {@link ComparisonModes} for the specific enumeration values, or for details
 * 	on using it as a bitmask instead. This allows you to properly handle exclusive bounds for start
 * 	vs end.
 * @param {any} a The {@link Range#start} or {@link Range#end} to be compared
 * @param {any} b The {@link Range#start} or {@link Range#end} to compare with
 * @param {?boolean} aExcl Whether `a` is an exclusive bound
 * @param {?boolean} bExcl Whether `b` is an exclusive bound
 * @returns {RangeType~CompareResult}
 */
/** Iterate values inside the range. This is called by {@link RangeGroup#iterate}
 * @function
 * @name RangeType.iterate
 * @param {?boolean} reverse Whether values should be iterated forward or backward. The order of is
 *  up to the {@link RangeType}, but in general *forward* should correspond to *ascending* order.
 * @param {...any} args Arbitrary arguments used to customize the iteration. These are forwarded
 * 	from {@link RangeGroup#iterate}
 * @returns {iterable} Can return a generator, or some other object implementing the iterable
 * 	interface
 */
/** Set the starting bound of a {@link Range}. Range starts are always modified using this method,
 * so that a {@link RangeType} can implement *auto-normalization*: normalizing the bound to be
 * inclusive.
 * @function
 * @name RangeType.setStart
 * @param {Range} range the range to modify
 * @param {any} start the starting bound
 * @param {?boolean} startExcl whether the start is exclusive
 * @returns {Range} the modified range
 */
/** Set the ending bound of a {@link Range}. Range ends are always modified using this method,
 * so that a {@link RangeType} can implement *auto-normalization*: normalizing the bound to be
 * inclusive.
 * @function
 * @name RangeType.setEnd
 * @param {Range} range the range to modify
 * @param {any} end the new ending bound
 * @param {?boolean} endExcl whether the end is exclusive 
 * @returns {Range} the modified range
 */