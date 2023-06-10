import { create, copy, compare as compare_base, size as size_base } from "./helpers/common.mjs";

function compare(mode, a, b){
	const out = compare_base(mode, a, b);
	// distance is just values in-between for discrete
	out.distance -= out.side;
	return out;
}
function size(r){
	return size_base(r)+1;
}

/** This is the same as {@link IntType}, but where the range bounds have been normalized to always
 * be inclusive. This can be easier to work with, and omits the extra logic needed to handle
 * exclusive bounds. For example, `(0,5)` would be normalized on creation to be `[1,4]` instead.
 * @implements {RangeType}
 */
const IntNormType = {
	create,
	copy,
	compare,
	size,
	setStart(range, start, startExcl){
		range.start = +start + (startExcl^0);
		return range;
	},
	setEnd(range, end, endExcl){
		range.end = +end - (endExcl^0);
		return range;
	},
	*iterate(r, reverse){
		if (reverse){
			for (let i = r.end; i >= r.start; i--)
				yield i;
		}
		else{
			for (let i = r.start; i <= r.end; i++)
				yield i;
		}
	}
};

export default IntNormType;
export { compare, size };