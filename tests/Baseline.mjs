import IntType from "../src/types/int.mjs";

/** Simple, inefficient baseline implementation of RangeGroup that holds exhaustive set */
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
	*iterate(forward=true){
		if (forward){
			for (const v of this.values)
				yield v;
		}
		else{
			for (let i=this.values.length-1; i>=0; --i)
				yield this.values[i];
		}
	}
	[Symbol.iterator](){
		return this.iterate();
	}
	diff(other, {filter=false, copy=false, bool=false}={}){
		if (typeof filter !== "number")
			filter = filter ? (filter.a << 0) | (filter.b << 1) | (filter.ab << 2) : 0b111;

		this._split_length = 0;
		this._union_length = 0;
		let prev_type = 0;
		const out = [];
		const emit = (val, type) => {
			if (filter & type){
				if (bool) return true;
				out.push(val);
				if (out.at(-1)+1 !== val){
					this._split_length++;
					this._union_length++;
				}
				else if (type !== prev_type)
					this._split_length++;
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
		if (copy){
			const b = new Baseline([]);
			b.values = out;
			return b;
		}
		this.values = out;
		return this;
	}
}