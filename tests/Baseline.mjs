import IntType from "../src/types/Int.mjs";

/** Simple, inefficient baseline implementation of RangeGroup that holds exhaustive set. Only
 * works for discrete types, e.g. IntType
 */
export default class Baseline{
	/** Create new baseline group
	 * @param ranges 2d array of arguments for constructing
	 */
	constructor(ranges){
		const s = new Set();
		for (const r of ranges){
			const vals = IntType.iterate(IntType.create(...r));
			for (const v of vals)
				s.add(v);
		}
		this.values = Array.from(s);
		this.values.sort((a,b) => a-b);
	}
	*iterate(reverse=false){
		if (reverse){
			for (let i=this.values.length-1; i>=0; --i)
				yield this.values[i];
		}
		else{
			for (const v of this.values)
				yield v;
		}
	}
	[Symbol.iterator](){
		return this.iterate();
	}
	diff(other, {filter=false, copy=false, bool=false}={}){
		if (typeof filter !== "number")
			filter = filter ? (filter.a << 0) | (filter.b << 1) | (filter.ab << 2) : 0b111;

		let _split_length = 0;
		let _union_length = 0;
		let prev_type = 0;
		const out = [];
		const emit = (val, type) => {
			if (filter & type){
				if (bool) return true;
				if (out.at(-1)+1 !== val){
					_split_length++;
					_union_length++;
				}
				else if (type !== prev_type)
					_split_length++;
				out.push(val);
			}
			prev_type = type;
		};

		let i=0, j=0;
		while (i < this.values.length || j < other.values.length){
			const a = this.values[i] ?? Infinity;
			const b = other.values[j] ?? Infinity;
			if (a < b){
				if (emit(a, 0b1))
					return true;
				i++;
			}
			else if (a > b){
				if (emit(b, 0b10))
					return true;
				j++;
			}
			else{
				if (emit(a, 0b100))
					return true;
				i++; j++;
			}
		}
		if (bool)
			return false;
		let group = copy ? new Baseline([]) : this;
		group.values = out;
		group._split_length = _split_length;
		group._union_length = _union_length;
		return group;
	}
	size(){ return this.values.length; }
}