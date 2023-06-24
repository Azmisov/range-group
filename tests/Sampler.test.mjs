import { Sampler, RangeGroup, IntType } from "../src/barrel.mjs";
import seed from "seed-random";
const rand = seed("SamplerTests");

function rand_int(min, max){
	// generate random integer
	return Math.floor(rand()*(max-min+1))+min;
}

function rand_args(ranges=5, max_val=100, max_size=6){
	const args = [];
	for (let r=0; r<ranges; r++){
		const i = rand_int(0, max_val);
		const len = rand_int(-max_size+2, max_size);
		const se = !rand_int(0,1);
		const ee = !rand_int(0,1);
		args.push([i, i+len, se, ee]);
	}
	return new RangeGroup(args, {type:IntType, normalize:true});
}

test("sampler errors", () => {
	expect(() => {
		new Sampler(new RangeGroup([],{type:IntType}));
	}).toThrow("empty");
	expect(() => {
		new Sampler(new RangeGroup([[3,2.9],[-3,-4]],{type:IntType}));
	}).toThrow("normalized");
});

test("sampler random", () => {
	for (let g=0; g<10; g++){
		const group = rand_args();
		const sampler = new Sampler(group);
		for (let s=0; s<50; s++){
			const val = sampler.sample();
			expect(group.has(val)).toBe(true);
		}
		// edge cases
		for (let f of [-1,0,.5,1,2]){
			const val = sampler.sample(f);
			expect(group.has(val)).toBe(true);
		}
	}
});