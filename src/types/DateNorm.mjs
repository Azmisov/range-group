import { create, copy } from "./helpers/common.mjs";
import IntNormType from "./IntNorm.mjs";

/** This is the same as {@link DateType}, but where the range bounds have been normalized to always
 * be inclusive. This can be easier to work with, and omits the extra logic needed to handle
 * exclusive bounds.
 * 
 * This uses {@link IntNormType} as its base type.
 * @implements {RangeType}
 */
const DateNormType = {
	base_type: IntNormType,
	create,
	// copy range, with possible normalization from base_type
	setStart(range, start, startExcl){
		this.base_type.setStart(range, start, startExcl);
		range.start = new Date(range.start);
		return range;
	},
	setEnd(range, end, endExcl){
		this.base_type.setEnd(range, end, endExcl);
		range.end = new Date(range.end);
		return range;
	},
	copy(range){
		const out = copy(range);
		out.start = new Date(out.start);
		out.end = new Date(out.end);
		return out;
	},
	// simple delegation to base_type
	size(range){ return this.base_type.size(range); },
	compare(...args){ return this.base_type.compare(...args); },
	*iterate(...args){
		for (const ms of this.base_type.iterate(...args))
			yield new Date(ms);
	}
};

export default DateNormType;