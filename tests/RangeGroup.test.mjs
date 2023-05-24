import seed from "seed-random";
import IntType from "../types/int.mjs";
import { RangeGroup } from "../RangeGroup.mjs";
const rand = seed("RangeGroupTests");

function rand_int(min, max){
	// generate random integer
	return Math.floor(rand()*(max-min+1))+min;
}

/** Simple baseline implementation that holds exhaustive set */
class Baseline{
	constructor(ranges){
		const s = new Set();
		for (const r of ranges){
			const vals = IntType.iterate({
				start: r[0],
				end: r[1]
			});
			for (const v of vals){
				console.log(v);
				s.add(v);
			}
		}
		this.values = Array.from(s);
		this.values.sort((a,b) => a-b);
	}
	*iterate(){
		for (const v of this.values)
			yield v;
	}

}

test("self union", () => {
	const samples = 1000;
	const ranges = 5;
	for (let s=0; s<samples; s++){
		const args = [];
		for (let r=0; r<ranges; r++){
			const i = rand_int(0, 100);
			const len = rand_int(-3, 5);
			args.push([i, i+len]);
		}
		const a = Array.from((new RangeGroup(args, {type:IntType, normalize:true})).iterate());
		const b = Array.from((new Baseline(args)).iterate());
		expect(a).toEqual(b);
	}
});