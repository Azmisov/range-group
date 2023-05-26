import { ComparisonModes } from "../RangeGroup.mjs";

/** Use for integer ranges. E.g. `[0,5) [10,12]`
 * @implements {RangeType}
 */
const IntType = {
	create(start, end){
		// TODO: return this.copy(start) if start's an object?
		if (start === undefined)
			return {};
		return { start, end };
	},
	copy(obj){
		return Object.assign({}, obj);
	},
	size(r){
		let s = r.end-r.start+1;
		if (r.startExcl) s--;
		if (r.endExcl) s--;
		return s;
	},
	compare(mode, a, b, aExcl, bExcl){
		if (aExcl)
			a += mode & 0b1 ? -1 : 1;
		if (bExcl)
			b += mode & 0b10 ? -1 : 1;
		const delta = a-b;
		// no gap between?
		if (mode === ComparisonModes.END_START && delta === -1)
			return -0;
		return delta;
	},
	interpolate(el, start, end, startExcl, endExcl){
		if (startExcl) start++;
		if (endExcl) end--;
		return (el-start)/(end-start);
	},
	*iterate(r, forward){
		if (forward){
			let i = r.start + !!r.startExcl;
			const end = r.end + !r.endExcl;
			for (; i < end; i++)
				yield i;
		}
		else{
			let i = r.end - !!r.endExcl;
			const end = r.start - !r.startExcl;
			for (; i > end; i--)
				yield i;
		}
	}
};

export default IntType;