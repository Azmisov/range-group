import seed from "seed-random";
import IntType from "../types/int.mjs";
import { RangeGroup } from "../RangeGroup.mjs";
const rand = seed("RangeGroupTests");

function rand_int(min, max){
	// generate random integer
	return Math.floor(rand()*(max-min+1))+min;
}

/** Simple, inefficient baseline implementation that holds exhaustive set */
class Baseline{
	constructor(ranges){
		const s = new Set();
		for (const r of ranges){
			const vals = IntType.iterate({
				start: r[0],
				end: r[1]
			});
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

//*

function rand_args(){
	const ranges = 5;
	const args = [];
	for (let r=0; r<ranges; r++){
		const i = rand_int(0, 100);
		const len = rand_int(-3, 5);
		args.push([i, i+len]);
	}
	const r = new RangeGroup(args, {type:IntType, normalize:true});
	const b = new Baseline(args);
	return [r,b];
}

test("self union randomized", () => {
	const samples = 1000;
	for (let s=0; s<samples; s++){
		const [rangegroup, baseline] = rand_args();
		const a = Array.from((rangegroup).iterate());
		const b = Array.from((baseline).iterate());
		expect(a).toEqual(b);
	}
});
test("self union cases", () => {
	expect(new RangeGroup([[0,-1]], {type:IntType, normalize:true}).ranges).toHaveLength(0);
	expect(new RangeGroup([[-1,-1]], {type:IntType, normalize:true}).ranges).toHaveLength(1);
	// should merge all
	let r = new RangeGroup([[0,5],[0,0],[0,-2],[0,3],[1,2],[2,5],[5,5],[6,5]], {type:IntType, normalize:true});
	expect(r.ranges).toHaveLength(1);
	let r_arr = Array.from(r.iterate(true));
	expect(r_arr).toEqual([0,1,2,3,4,5]);
	// should merge all
	r = new RangeGroup([[1,4],[5,6],[7,7],[8,10]], {type:IntType, normalize:true});
	expect(r.ranges).toHaveLength(1);
});

test("iterate", () => {
	const args = [[0,5],[12,16],[19,20]];
	const r = new RangeGroup(args, {type:IntType});
	const b = new Baseline(args);
	expect(Array.from(r.iterate())).toEqual(Array.from(b.iterate()));
	expect(Array.from(r.iterate(false))).toEqual(Array.from(b.iterate(false)));
});

test("diff randomized", () => {
	const samples = 1000;
	for (let filter=1; filter<=7; filter++){
		// console.log("filter:", filter);
		for (let s=0; s<samples; s++){
			// console.log("sample:", s);
			const [Ra, Ba] = rand_args();
			const [Rb, Bb] = rand_args();
			Ra.diff(Rb, {filter, copy:false});
			Ba.diff(Bb, {filter, copy:false});
			const a = Array.from(Ra.iterate());
			const b = Array.from(Ba.iterate());
			expect(a).toEqual(b);
		}
	}
});

//*/