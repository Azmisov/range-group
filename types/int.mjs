import { ComparisonModes } from "../RangeGroup.mjs";

const IntType = {
	create(start, end){
		return { start, end };
	},
	copy(obj){ return Object.assign({}, obj); },
	compare(a, b, aExcl, bExcl, mode){
		if (aExcl)
			a += mode & 0b1 ? -1 : 1;
		if (bExcl)
			b += mode & 0b10 ? -1 : 1;
		const delta = a-b;
		// no gap between?
		if (mode === ComparisonModes.END_START && Math.abs(delta) == 1)
			return 0;
		return delta;
	},
	*iterate(r, forward){
		if (forward){
			let i = r.start + r.startExcl;
			const end = r.end + !r.endExcl;
			for (; i < end; i++)
				yield i;
		}
		else{
			let i = r.end - r.endExcl;
			const end = r.start - !r.startExcl;
			for (; i > end; i--)
				yield i;
		}
	}
};

export default IntType;