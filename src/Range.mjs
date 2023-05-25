// This file mainly just holds range interface definition

/**
 * @typedef {object} Range
 * @property {any} start start of range
 * @property {any} end end of range
 * @property {?boolean} startExcl whether the start is exclusive; if falsey or not present, it
 * 	defaults to inclusive
 * @property {?boolean} endExcl whether the end is exclusive; if falsey or not present, it defaults
 * 	to inclusive
 * @property {?number} a Indicates the index from {@link RangeGroup#ranges}, for which this range
 * 	was sourced from during a boolean set operation. This is set from {@link RangeGroup#diff} if
 * 	the `track_sources` option is enabled. A value of `null` indicates the range was not present
 * 	in group `a`.
 * @property {?number} b Indicates the index from {@link RangeGroup#ranges}, for which this range
 * 	was sourced from during a boolean set operation. This is set from {@link RangeGroup#diff} if
 * 	the `track_sources` option is enabled. A value of `null` indicates the range was not present
 * 	in group `b`.
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
 * @param {any} a Range start/end to compare with
 * @param {any} b Range start/end to compare with
 * @param {ComparisonModes} mode what kind of combination of start/end is being compared
 * @returns {number} -1 if a comes before b, 1 if a comes after b, or 0 if they are equal; for
 * 	`END_START` comparisons you may return 0 if there is no gap between the two ranges
 */
/**
 * Iterate all values inside the range
 * @function
 * @name RangeType#iterate
 * @param {...any} args arguments to customize iteration
 * @returns {iterable} can return a generator, or some other iterable that can be used in a for loop
 */

/** Set range start */
export function setStart(obj, value, excl){
	obj.start = value;
	if (excl)
		obj.startExcl = excl;
	return obj;
}
/** Set range end */
export function setEnd(obj, value, excl){
	obj.end = value;
	if (excl)
		obj.endExcl = excl;
	return obj;
}