/** Use for integer ranges. E.g. `[0,5) [10,12]`
 * @implements {RangeType}
 */
const IntType = {
	create(start, end, startExcl, endExcl){
		// TODO: return this.copy(start) if start's an object?
		if (start === undefined)
			return {};
		const o = { start, end };
		if (startExcl) o.startExcl = startExcl;
		if (endExcl) o.endExcl = endExcl;
		return o;
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
	},
	// new unified compare + interpolate method
	compare(mode, a, b, aExcl, bExcl){
		if (aExcl)
			a += 1 - ((mode & 0b1) << 1);
		if (bExcl)
			b += 1 - (mode & 0b10);
		let distance = a-b;
		const side = Math.sign(distance);
		distance -= side;
		return {distance, side};
	}
};

export default IntType;