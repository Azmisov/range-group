import seed from "seed-random";
import IntType from "../src/types/int.mjs";
import { RangeGroup } from "../src/RangeGroup.mjs";
import Baseline from "./Baseline.mjs";
const rand = seed("RangeGroupTests");

function rand_int(min, max){
	// generate random integer
	return Math.floor(rand()*(max-min+1))+min;
}

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
		const a = Array.from(rangegroup);
		const b = Array.from(baseline);
		expect(a).toEqual(b);
	}
});
test("self union cases", () => {
	expect(new RangeGroup([[0,-1]], {type:IntType, normalize:true}).ranges).toHaveLength(0);
	expect(new RangeGroup([[-1,-1]], {type:IntType, normalize:true}).ranges).toHaveLength(1);
	// should merge all
	let r = new RangeGroup([[0,5],[0,0],[0,-2],[0,3],[1,2],[2,5],[5,5],[6,5]], {type:IntType, normalize:true});
	expect(r.ranges).toHaveLength(1);
	let r_arr = Array.from(r);
	expect(r_arr).toEqual([0,1,2,3,4,5]);
	// should merge all
	r = new RangeGroup([[1,4],[5,6],[7,7],[8,10]], {type:IntType, normalize:true});
	expect(r.ranges).toHaveLength(1);
});

test("iterate", () => {
	const args = [[0,5],[12,16],[19,20]];
	const r = new RangeGroup(args, {type:IntType});
	const b = new Baseline(args);
	expect(Array.from(r)).toEqual(Array.from(b));
	expect(Array.from(r.iterate(false))).toEqual(Array.from(b.iterate(false)));
});

test("args", () => {
	// argument types
	let r1 = new RangeGroup([0,5], {type: IntType});
	let r2 = new RangeGroup({start:0,end:5}, {type: IntType});
	let r3 = new RangeGroup([{start:0,end:5}], {type: IntType});
	let r4 = new RangeGroup([[0,5]], {type: IntType});
	let b1 = Array.from(new Baseline([[0,5]]).iterate());
	for (let r of [r1,r2,r3,r4]){
		expect(Array.from(r)).toEqual(b1);
	}
	// bad argument type
	expect(() => {
		// won't fail immediately; we don't validate every arg
		let rbad = new RangeGroup([new Date(), "test", [9]]);
		rbad.sort();
	}).toThrow()
	// diff args
	expect(() => {
		r1.diff(r1);
	}).toThrow(/diff against the same/);
	expect(() => {
		r1.diff(r2, {filter:0b1000});
	}).toThrow(/out of range/)
	expect(() => {
		r1.diff(r2, {filter:{ab:100}});
	}).toThrow(/out of range/)
});

test("diff randomized", () => {
	const samples = 1000;
	for (let filter=1; filter<=7; filter++){
		// console.log("filter:", filter);
		for (let s=0; s<samples; s++){
			// console.log("sample:", s);
			const [Ra, Ba] = rand_args();
			const [Rb, Bb] = rand_args();
			const cache = structuredClone(Ra.ranges);
			const Rcopy = Ra.diff(Rb, {filter, copy:true});
			// copy shouldn't modify original
			expect(cache).toEqual(Ra.ranges);
			const Bcopy = Ba.diff(Bb, {filter, copy:true});
			const a = Array.from(Rcopy);
			const b = Array.from(Bcopy);
			// correct results?
			expect(a).toEqual(b);
			// bool should gives results without modifying
			const res = Ra.diff(Rb, {filter, copy:false, bool:true});
			expect(res).toEqual(!!Rcopy.ranges.length);
			// again, shouldn't modify
			expect(cache).toEqual(Ra.ranges);
			// in-place should give same results
			Ra.diff(Rb, {filter, copy:false});
			const c = Array.from(Ra);
			expect(c).toEqual(b);

		}
	}
});

// Preset case
function setup_case(){
	return [
		new RangeGroup([[0,10],[20,30]], {type:IntType}),
		new RangeGroup([[6,12],[17,24]], {type:IntType})
	];
}
function set_operation(method, copyMethod, boolMethod, result){
	const [a,b] = setup_case();
	const cache = structuredClone(a.ranges);
	// these methods should not mutate
	const c = a[copyMethod](b);
	expect(a.ranges).toEqual(cache);
	expect(c.ranges).toEqual(result);
	if (boolMethod){
		const d = a[boolMethod](b);
		expect(a.ranges).toEqual(cache);
		expect(d).toBe(!!result.length);
	}
	// this can mutate
	a[method](b);
	expect(a.ranges).toEqual(result);
}
test("union", set_operation.bind(null,
	"union","toUnioned","hasUnion",
	[{start:0,end:12},{start:17,end:30}]
));
test("intersect", set_operation.bind(null,
	"intersect","toIntersected","hasIntersection",
	[{start:6,end:10},{start:20,end:24}]
));
test("difference", set_operation.bind(null,
	"difference","toDifferenced","hasDifference",
	[{start:0,end:6,endExcl:true},{start:24,startExcl:true,end:30}]
));
test("symmetric difference", set_operation.bind(null,
	"symmetricDifference","toSymmetricDifferenced","hasSymmetricDifference",
	[
		{start:0,end:6,endExcl:true},{start:10,startExcl:true,end:12},
		{start:17,end:20,endExcl:true},{start:24,startExcl:true,end:30}
	]
));
test("symmetric difference extra", () => {
	// doesn't use diff, so needs extra tests
	const a = new RangeGroup([0,5], {type:IntType});
	const b = new RangeGroup([0,10], {type:IntType});
	const c = new RangeGroup([[0,5],[7,12]], {type:IntType});
	const d = new RangeGroup([[0,5]], {type:IntType});
	expect(a.hasSymmetricDifference(a)).toBe(false);
	expect(a.hasSymmetricDifference(c)).toBe(true);
	expect(a.hasSymmetricDifference(b)).toBe(true);
	expect(a.hasSymmetricDifference(d)).toBe(false);
});
test("clear", set_operation.bind(null, "clear", "toCleared", null, []));
test("empty", () => {
	const a = new RangeGroup([[0,5]], {type:IntType});
	expect(a.isEmpty()).toBe(false);
	const b = new RangeGroup([[0,-5]], {type:IntType});
	expect(b.isEmpty()).toBe(false);
	expect(b.normalize().isEmpty()).toBe(true);
	expect(a.clear().isEmpty()).toBe(true);
	const c = new RangeGroup([], {type: IntType});
	expect(c.isEmpty()).toBe(true);
});

/* TODO:
	check that Range is never modified in diff randomized
	diff sources
	diff self_union disabled
	more rigorously check that bool is not modifying
	all the missing methods
*/