// This file mainly just holds range interface definition

/** Interface that all Range objects must implement
 * @interface Range
 */
/**
 * Start of range
 * @name Range#start
 * @type {any}
 */
/**
 * End of range
 * @name Range#end
 * @type {any}
 */
/**
 * Whether {@link Range#start} is exclusive; if falsey or not present, it defaults to inclusive
 * @name Range#startExcl
 * @type {?boolean}
 */
/**
 * Whether {@link Range#end} is exclusive; if falsey or not present, it defaults to inclusive
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


/**
 * Range interface for use with {@link RangeGroup}
 * @interface RangeType
 */
/**
 * Compares the start/end of two ranges
 * @function
 * @static
 * @name RangeType.compare
 * @param {ComparisonModes} mode What combination of range starts/ends is being compared. You will
 *  likely need to handle exclusive/inclusive differently for range starts vs ends. Secondly,
 *  {@link ComparisonModes.END_START} mode allows you to specify whether two adjacent, but
 *  non-intersecting ranges can be merged by returning `-0`.
 * @param {any} a Range start/end to compare with
 * @param {any} b Range start/end to compare with
 * @returns {number} One of the following:
 * - negative number if `a` comes before `b`
 * - positive number if `a` comes after `b`
 * - `+0` if `a` and `b` have the same position
 * - For {@link ComparisonModes.END_START}, you may return `-0` (negative zero) if `a` comes before `b`,
 * 	 but there are no values between them. This indicates that the two ranges are adjacent and
 *   can be merged. For example, with integer ranges, you might return `-0` for
 *   `compare(ComparisonModes.END_START, 5, 6)`.
 */
/**
 * Iterate all values inside the range
 * @function
 * @name RangeType#iterate
 * @param {...any} args Arbitrary arguments used to customize the iteration
 * @returns {iterable} Can return a generator, or some other object implementing the iterable
 * 	interface. This is called by {@link RangeGroup#iterate}
 */

/** Set range start
 * @private
 */
export function setStart(obj, value, excl){
	obj.start = value;
	if (excl)
		obj.startExcl = excl;
	return obj;
}
/** Set range end
 * @private
 */
export function setEnd(obj, value, excl){
	obj.end = value;
	if (excl)
		obj.endExcl = excl;
	return obj;
}