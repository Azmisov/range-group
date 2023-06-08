import {create, copy, setStart, setEnd} from "./helpers/common.mjs";
import {
	compare as compare_float_normalized,
	size
} from "./FloatNorm.mjs";

/** Implementation of {@link RangeType} for real values. You can use this to implement any
 * continuous {@link RangeType}, so long as you can map them to the domain of reals. In reality the
 * operations will be using floating point arithmetic. However the assumptions made by the
 * {@link RangeType.compare} method for this type are that each value is a point on a continuous
 * number line.
 * 
 * Inputs for this type are [coerced to
 * numbers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number#number_coercion)
 * prior to calculations.
 * @implements {RangeType}
 */
const RealType = {
	create,
	copy,
	setStart,
	setEnd,
	size,
	/** The distance is simply the signed difference: e.g. the distance from start-to-end of
 	 * `[0.25,4.75)` is 4.5, and end-to-start is -4.5. An exclusive bound can be thought of as the
 	 * limit as we approach the value from +∞ (range end) or -∞ (range start). This gives you the
 	 * *sidedness* of a value: e.g. the range end of `[0.5,4.75)` comes before `[0,5,4.75]`.
	 */
	compare(mode, a, b, aExcl, bExcl){
		const out = compare_float_normalized(mode, a, b);
		// handle exclusion
		if (!out.side){
			// similar computation to normalization for discrete case
			out.side = Math.sign(
				(aExcl ? 1 - ((mode & 0b1) << 1) : 0) -
				(bExcl ? 1 - (mode & 0b10) : 0)
			);
		}
		return out;
	},
};

export default RealType;