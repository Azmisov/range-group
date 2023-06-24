import {create, copy, compare, size, setStart, setEnd} from "./helpers/common.mjs";

/** Implementation of {@link RangeType} for real values. You can use this to implement any
 * continuous {@link RangeType}, so long as you can map them to the domain of reals. In reality the
 * operations will be using floating point arithmetic. However the assumptions made by the
 * {@link RangeType.compare} method for this type are that each value is a point on a continuous
 * number line.
 * 
 * No {@link RangeType.iterate} implementation is provided, as it represents a continuous type.
 * 
 * The builtin {@link RangeType.sample} method is not perfect. Firstly, we cannot map `[0,1)` to any
 * floating point range, e.g. we can only sample half of the values in `[-1,1]`. Exclusion is only
 * handled properly when the end, and only end, is exclusive. This matches the exclusion of the
 * input `[0,1)`. If the end is inclusive, it won't ever get sampled. If the start is exclusive, it
 * could get falsely sampled. For accurate handling of exclusion, you can consider using the
 * {@link FloatNormType} instead. Another alternative would be to write your own sampler which
 * resamples if the value is exclusive (e.g. perhaps returning null and looping elsewhere until
 * non-null).
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
		const out = compare(mode, a, b);
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
	sample(range, i){
		return +range.start + i*size(range);
	}
};

export default RealType;