import { create, copy, setStart, setEnd } from "./helpers/common.mjs";
import { compare, size } from "./IntNorm.mjs";

/** Implementation of {@link RangeType} for integer values. You can use this to implement
 * any discrete {@link RangeType}, so long as you can map the values to the domain of integers.
 * 
 * Inputs for this type are [coerced to
 * numbers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number#number_coercion)
 * prior to calculations.
 * @implements {RangeType}
 */
const IntType = {
	create,
	copy,
	setStart,
	setEnd,
	/** Exclusion is implemented by an increment or decrement to a neighboring integer: e.g. `[0,5)`
 	 * is equivalent to `[0,4]`. The distance between two integers is the signed count of integers
 	 * that lie between them: e.g. the distance from start-to-end of `[0,5]` is 4, and end-to-start
 	 * is -4.
	 */
	compare(mode, a, b, aExcl, bExcl){
		// normalize a/b to be inclusive first; exclusive start = +1, exclusive end = -1;
		// note we do (v = +v + ...) instead of (v += ...) to do explicit cast to number
		if (aExcl)
			a = +a + 1 - ((mode & 0b1) << 1);
		if (bExcl)
			b = +b + 1 - (mode & 0b10);
		return compare(mode, a, b);
	},
	size(r){
		let s = size(r);	
		if (r.startExcl) s--;
		if (r.endExcl) s--;
		return s;
	},
	*iterate(r, reverse){
		// using xor to possibly invert, and convert to number in single op;
		// it handles conversion of `undefined` values, where alternative is to cast to boolean first, then number
		if (reverse){
			let i = r.end - (r.endExcl^0);
			const end = r.start - (r.startExcl^1);
			for (; i > end; i--)
				yield i;
		}
		else{
			let i = r.start + (r.startExcl^0);
			const end = r.end + (r.endExcl^1);
			for (; i < end; i++)
				yield i;
		}
	}
};

const DateType = IntType;

export { IntType as default, DateType };