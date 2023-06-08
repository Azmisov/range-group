import { create, copy } from "./helpers/common.mjs";
import IntType from "./Int.mjs";

/** Implementation of {@link RangeType} for JavaScript Date objects. Internally, this type is
 * represented as an {@link IntType} operating on the Date's numeric millisecond value (the Unix
 * timestamp). Hence, the following ranges would get merged by {@link RangeGroup#normalize}:
 * ```js
 * [new Date(0), new Date(10)]
 * [new Date(11), new Date(20)]
 * ```
 * @implements {RangeType}
 */
const DateType = {
	base_type: IntType,
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
	*iterate(range){
		for (const ms of this.base_type.iterate(range))
			yield new Date(ms);
	}
};

export default DateType;