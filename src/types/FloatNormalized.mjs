import {create, copy} from "./common.mjs";

function compare_unnormalized(mode, a, b){
	// prefixed + to do explicit cast to number
	const distance = +a-b;
	const side = Math.sign(distance);
	return {distance, side};
}
function size(r){
	return +r.end-r.start;
}

const _f64 = new Float64Array(1)
const _b64 = new BigInt64Array(_f64.buffer);
/** Gets next floating point number in a particular direction.
 * Minorly adapted from: https://stackoverflow.com/a/72185420/379572
 * @param {number} start number to modify
 * @param {number} direction modify `start` in the direction of this number; e.g. you can set this
 * 	to +/-Infinity to increment/decrement respectively.
 * @returns {number}
 * @private
 */
function next_after(start, direction){
	// Branch to descending case first as it is more costly than ascending
	// case due to start != 0.0d conditional.
	if (start > direction) {
		// descending
		if (start !== 0) {
			_f64[0] = start;
			const transducer = _b64[0];
			_b64[0] = transducer + (transducer > 0n ? -1n : 1n);
			return _f64[0];
		} else {
			// start == 0.0d && direction < 0.0d
			return -Number.MIN_VALUE;
		}
	} else if (start < direction) {
		// ascending
		// Add +0.0 to get rid of a -0.0 (+0.0 + -0.0 => +0.0)
		// then bitwise convert start to integer.
		_f64[0] = start + 0;
		const transducer = _b64[0];
		_b64[0] = transducer + (transducer >= 0n ? 1n : -1n);
		return _f64[0];
	} else if (start == direction) {
		return direction;
	} else {
		// isNaN(start) || isNaN(direction)
		return start + direction;
	}
}

/** This is similar to {@link RealType}, but assuming a discrete, floating point representation. The
 * bounds are normalized to always be inclusive. This can be easier to work with, and omits the
 * extra logic needed to handle exclusive bounds.
 * 
 * True real numbers cannot be normalized: e.g. for the half-open interval `[.25,4.75)`, you cannot
 * represent the value that is infinitely close, but not equal to 4.75. However, for finite
 * representations like floating point, you can normalize to the next closest representable number:
 * e.g. 4.74999952316 for a 32 bit float. This is the kind of normalization this type performs.
 * 
 * Normalization uses typed arrays and BigInt to get the binary representation of a number as a
 * floating point, meaning possibly less browser support than {@link RealType}. While the logic for
 * handling exclusive bounds is ommitted, the {@link RangeType.compare} method needs to perform
 * extra calculations to determine if two values are adjacent floating point numbers, and thus have
 * zero distance.
 * @implements RangeType
 */
const FloatNormalizedType = {
	create,
	copy,
	size,
	compare(mode, a, b){
		const out = compare_unnormalized(mode, a, b);
		if (out.side){
			if (next_after(a, -out.side*Infinity) === b)
				out.distance = 0;
		}
		return out;
	},
	setStart(range, start, startExcl){
		if (startExcl)
			start = next_after(start, Infinity);
		range.start = start;
	},
	setEnd(range, end, endExcl){
		if (endExcl)
			end = next_after(end, -Infinity);
		range.end = end;
	}
};

export default FloatNormalizedType;
export { compare_unnormalized as compare, size }