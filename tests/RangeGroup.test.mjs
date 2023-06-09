// I'm using random testing, which I find is good at catching weird corner cases in diffing
// algorithms; but that means these test cases will take a bit to run
import {expect, jest} from '@jest/globals';
import seed from "seed-random";
import { IntType, ComparisonModes, RangeGroup, CommonType } from "../src/barrel.mjs";
import Baseline from "./Baseline.mjs";
const rand = seed("RangeGroupTests");

// console.log(rand(), rand(), rand());

// increase time when debugging
jest.setTimeout(6000000);

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

	// bool version
	r = new RangeGroup([[1,4],[5,6],[7,7],[8,10]], {type:IntType, normalize:false});
	const hasChanged = diffChanged(r);
	expect(r.hasSelfUnion()).toBe(true);
	expect(r.hasSelfUnion(r => r.start > 11)).toBe(false);
	hasChanged(r);

	// copy version
	const a = r.toSelfUnioned();
	const b = r.toSelfUnioned(v => v.start > 5);
	hasChanged(r);
	expect(a.ranges).toEqual([{start:1,end:10}]);
	expect(b.ranges).toEqual([{start:7,end:10}]);

	// in-place filter
	const i = new RangeGroup([{start:0,end:10,a:5,b:null},{start:11,end:12,a:6,b:0},{start:13,end:15,a:null,b:2}], {type:IntType});
	i.selfUnion({filter:r => r.b !== null});
	expect(i.ranges).toEqual([{start:11,end:15,a:6,b:0}]);
});

test("iterate", () => {
	const args = [[0,5],[12,16],[19,20]];
	const r = new RangeGroup(args, {type:IntType});
	const b = new Baseline(args);
	expect(Array.from(r)).toEqual(Array.from(b));
	expect(Array.from(r.iterate())).toEqual(Array.from(b.iterate()));
	// reverse iterate
	expect(Array.from(r.iterate(true))).toEqual(Array.from(b.iterate(true)));
});

test("args", () => {
	// argument types
	let r1 = new RangeGroup([0,5], {type: IntType});
	let r2 = new RangeGroup({start:0,end:5}, {type: IntType});
	let r3 = new RangeGroup([{start:0,end:5}], {type: IntType});
	let r4 = new RangeGroup([[0,5]], {type: IntType});
	let b1 = Array.from(new Baseline([[0,5]]).iterate(false));
	for (let r of [r1,r2,r3,r4]){
		expect(Array.from(r)).toEqual(b1);
	}
	let r5 = new RangeGroup(null, {type: IntType});
	expect(r5.size()).toBe(0);
	// bad argument type
	expect(() => {
		// won't fail immediately; we don't validate every arg
		let rbad = new RangeGroup([new Date(), "test", [9]]);
		rbad.sort();
	}).toThrow()
	// diff args
	expect(() => {
		r1.diff(r2, {filter:0b1000});
	}).toThrow(/out of range/)
	expect(() => {
		r1.diff(r2, {filter:{ab:100}});
	}).toThrow(/out of range/)
	// no RangeType given
	expect(() => {
		new RangeGroup();
	}).toThrow(/RangeGroup\.default_type/)
});

/* DIFF TESTING:
	Possible options:
		- filter
		- bool true, or copy true, or copy false (in-place)
		- bool not true:
			- self_union true, or track_sources true, or track_sources false
*/
// Loop through and setup a random test case for diffing
function* diffCombo(verbose=false){
	for (let filter=1; filter<=7; filter++){
		for (let s=0; s<10; s++){
			if (verbose)
				console.log(`filter ${filter} sample ${s}`);
			const [Ra, Ba] = rand_args();
			const [Rb, Bb] = rand_args();
			yield {filter, sample:s, Ra, Ba, Rb, Bb};
		}
		// empty case
		empty: {
			if (verbose)
				console.log(`filter ${filter} sample empty A`);
			const [Rb, Bb] = rand_args();
			yield {filter, sample:"empty-a", Ra: new RangeGroup([], {type:IntType}), Rb, Ba: new Baseline([]), Bb};
			if (verbose)
				console.log(`filter ${filter} sample empty B`);
			const [Ra, Ba] = rand_args();
			yield {filter, sample:"empty-a", Ra, Rb: new RangeGroup([], {type:IntType}), Ba, Bb: new Baseline([])};
			if (verbose)
				console.log(`filter ${filter} sample empty AB`);
			yield {
				filter,
				sample:"empty-ab",
				Ra: new RangeGroup([], {type:IntType}),
				Rb: new RangeGroup([], {type:IntType}),
				Ba: new Baseline([]),
				Bb: new Baseline([])
			};
		}
		// large test
		for (let s=0; s<5; s++){
			if (verbose)
				console.log(`filter ${filter} large test ${s}`);
			let x = rand_args(1000, 15000);
			let y = rand_args();
			if (!rand_int(0,1))
				[x,y] = [y,x];
			yield {filter, sample:s, Ra:x[0], Ba:x[1], Rb:y[0], Bb:y[1]};
		}
	}
}
// Cache RangeGroup data and return function that checks if group changed
function diffChanged(group){
	const array = group.ranges;
	const elements = Array.from(array);
	const values = structuredClone(elements);
	// returns function to check if it changed
	return (other) => {
		expect(array).toBe(other.ranges);
		expect(elements.length).toBe(other.ranges.length);
		for (let i=0; i<elements.length; i++){
			const ge = elements[i];
			const oe = other.ranges[i];
			expect(ge).toBe(oe);
		}
		// deep equality
		expect(other.ranges).toEqual(values);
	}
}
// Check if group is normalized
function diffNormalized(group){
	const isNormalized = diffChanged(group);
	group.normalize();
	isNormalized(group);
}
// Check if group is sorted
function diffSorted(group){
	const isSorted = diffChanged(group);
	group.sort();
	isSorted(group);
}
// Check that sources match srcA/srcB
function diffSources(out, srcA, srcB){
	function toSets(group){
		const single = group.ranges.map(r => new Set(IntType.iterate(r, true)));
		const all = new Set(group);
		return [single, all];
	}
	function validSource(src, single){
		if (src !== null){
			expect(Number.isInteger(src) && src >= 0).toBe(true);
			expect(single.length > src).toBe(true);
			return true;
		}
		return false;
	}
	function correctSource(val, src, single, all){
		if (src === null)
			expect(all.has(val)).toBe(false);
		else expect(single[src].has(val)).toBe(true);
	}
	const [srcA_single, srcA_all] = toSets(srcA);
	const [srcB_single, srcB_all] = toSets(srcB);
	for (const r of out.ranges){
		// one must be non-null
		expect(validSource(r.a, srcA_single) || validSource(r.b, srcB_single));
		for (const v of IntType.iterate(r, true)){
			correctSource(v, r.a, srcA_single, srcA_all);
			correctSource(v, r.b, srcB_single, srcB_all);			
		}
	}
}
// Check that group has no sources inserted
function diffNoSources(group){
	for (const r of group.ranges){
		expect(r.a).toBeUndefined();
		expect(r.b).toBeUndefined();
	}
}
test("diff randomized: bool", () => {
	for (const s of diffCombo()){
		const wasModifiedA = diffChanged(s.Ra);
		const wasModifiedB = diffChanged(s.Rb);
		const rres = s.Ra.diff(s.Rb, {filter:s.filter, bool:true, track_sources:true, copy:false, self_union:false});
		wasModifiedA(s.Ra);
		wasModifiedB(s.Rb);
		const bres = s.Ba.diff(s.Bb, {filter:s.filter, bool:true});
		// same output
		expect(rres).toBe(bres);
	}
});
test("diff randomized: copy", () => {
	for (const s of diffCombo()){
		const wasModifiedA = diffChanged(s.Ra);
		const wasModifiedB = diffChanged(s.Rb);
		const rres1 = s.Ra.diff(s.Rb, {filter:s.filter, bool:false, track_sources:false, copy:true, self_union:true});
		const rres2 = s.Ra.diff(s.Rb, {filter:s.filter, bool:false, track_sources:false, copy:true, self_union:false});
		wasModifiedA(s.Ra);
		wasModifiedB(s.Rb);
		const bres = s.Ba.diff(s.Bb, {filter:s.filter});
		// same elements?
		const bres_arr = Array.from(bres);
		expect(Array.from(rres1)).toEqual(bres_arr);
		expect(Array.from(rres2)).toEqual(bres_arr);
		// correct sizes?
		expect(rres1.ranges.length).toEqual(bres._union_length);
		expect(rres2.ranges.length).toEqual(bres._split_length);
		// non-intersecting
		expect(rres1.size()).toBe(bres.size());
		expect(rres2.size()).toBe(bres.size());
		// self_union should be normalized
		diffNormalized(rres1);
		// split should be sorted
		diffSorted(rres2);		
	}
});
test("diff randomized: in-place", () => {
	for (const s of diffCombo()){
		// make copy since will be in-place
		s.Ra2 = s.Ra.copy();
		const Ra_cache = s.Ra.ranges;
		const Ra2_cache = s.Ra2.ranges;

		const wasModifiedB = diffChanged(s.Rb);
		const rres1 = s.Ra.diff(s.Rb, {filter:s.filter, bool:false, track_sources:false, copy:false, self_union:true});
		const rres2 = s.Ra2.diff(s.Rb, {filter:s.filter, bool:false, track_sources:false, copy:false, self_union:false});
		wasModifiedB(s.Rb);
		// did modify
		expect(rres1.ranges).toBe(Ra_cache);
		expect(rres2.ranges).toBe(Ra2_cache);

		const bres = s.Ba.diff(s.Bb, {filter:s.filter});
		// same elements?
		const bres_arr = Array.from(bres);
		expect(Array.from(rres1)).toEqual(bres_arr);
		expect(Array.from(rres2)).toEqual(bres_arr);
		// correct sizes?
		expect(rres1.ranges.length).toEqual(bres._union_length);
		expect(rres2.ranges.length).toEqual(bres._split_length);
		// non-intersecting
		expect(rres1.size()).toBe(bres.size());
		expect(rres2.size()).toBe(bres.size());
		// self_union should be normalized
		diffNormalized(rres1);
		// split should be sorted
		diffSorted(rres2);
	}
});
test("diff randomized: copy track_sources", () => {
	for (const s of diffCombo(false)){
		const wasModifiedA = diffChanged(s.Ra);
		const wasModifiedB = diffChanged(s.Rb);
		const ytrack = s.Ra.diff(s.Rb, {filter:s.filter, bool:false, track_sources:true, copy:true, self_union:false});
		const ntrack = s.Ra.diff(s.Rb, {filter:s.filter, bool:false, track_sources:false, copy:true, self_union:false});
		wasModifiedA(s.Ra);
		wasModifiedB(s.Rb);
		// verify track_sources doesn't change diff (assume diff is correct)
		expect(ytrack.ranges).toMatchObject(ntrack.ranges);
		diffSources(ytrack, s.Ra, s.Rb);
		diffNoSources(ntrack);
	}
});
test("diff randomized: in-place track_sources", () => {
	for (const s of diffCombo(false)){
		// since modifying in-place, need a cache of original to see if source is correct
		const Ra_original = s.Ra.copy();
		s.Ra2 = s.Ra.copy();
		const wasModifiedB = diffChanged(s.Rb);
		const ytrack = s.Ra.diff(s.Rb, {filter:s.filter, bool:false, track_sources:true, copy:false, self_union:false});
		const ntrack = s.Ra2.diff(s.Rb, {filter:s.filter, bool:false, track_sources:false, copy:false, self_union:false});
		wasModifiedB(s.Rb);
		// should be modified
		expect(ytrack.ranges).toBe(s.Ra.ranges);
		expect(ntrack.ranges).toBe(s.Ra2.ranges);
		// verify track_sources doesn't change diff (assume diff is correct)
		expect(ytrack.ranges).toMatchObject(ntrack.ranges);
		diffSources(ytrack, Ra_original, s.Rb);
		diffNoSources(ntrack);
	}
});

test("diff cases", () => {
	// diff against same
	same: {
		const a = new RangeGroup([[0,5]], {type:IntType});
		expect(a.diff(a,{filter:0b1,bool:true})).toBe(false);
		expect(a.diff(a,{filter:{b:true},bool:true})).toBe(false);
		expect(a.diff(a,{filter:0b11,bool:true})).toBe(false);
		expect(a.diff(a,{filter:0b100,bool:true})).toBe(true);
		expect(a.diff(a,{filter:false,bool:true})).toBe(true);
		expect(a.diff(a,{filter:0b1,copy:true}).isEmpty()).toBe(true);
		expect(a.diff(a,{filter:0b10,copy:true}).isEmpty()).toBe(true);
		expect(a.diff(a,{filter:{a:true,b:true},copy:true}).isEmpty()).toBe(true);
		const res = a.diff(a,{filter:0b100,copy:true});
		expect(res.ranges).toEqual(a.ranges);
		expect(res.ranges === a.ranges).toBe(false);
		const res2 = res.diff(res,{filter:0b11});
		expect(res2).toBe(res);
		expect(res2.isEmpty()).toBe(true);
		a.diff(a,{track_sources:true});
		for (let i=0; i<a.ranges.length; i++){
			const r = a.ranges[i];
			expect(r.a).toBe(i);
			expect(r.b).toBe(i);
		}
	}
	// adjacent merge
	adjacent: {
		const a = new RangeGroup([[0,5]], {type:IntType});
		const b = new RangeGroup([[6,10]], {type:IntType});
		const res = a.diff(b,{bool:true});
		expect(res).toBe(true);
	}
	// on-the-fly conversion
	fly: {
		const a = new RangeGroup([0,5], {type:IntType});
		expect(a.diff([6,10]).ranges).toEqual([{start:0,end:10}]);
	}
	// interpolation search reaches end of the other array
	interpolation: {
		let ranges = [];
		for (let i=0; i<20; i++)
			ranges.push([i*3,i*3]);
		const a = new RangeGroup(ranges, {type:IntType});
		const b = new RangeGroup([100,100], {type:IntType});
		const res = a.diff(b, {filter:{ab:true}});
		expect(res.isEmpty()).toBe(true);
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
	const didChange = diffChanged(a);
	// these methods should not mutate
	const c = a[copyMethod](b);
	didChange(a);
	expect(c.ranges).toEqual(result);
	if (boolMethod){
		const d = a[boolMethod](b);
		didChange(a);
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
test("union extra", () => {
	const a = new RangeGroup([], {type:IntType});
	const b = new RangeGroup([0,5], {type:IntType});
	expect(a.hasUnion(b)).toBe(true);
	expect(a.hasUnion(a)).toBe(false);
});
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
test("symmetric difference/equal extra", () => {
	// doesn't use diff, so needs extra tests
	const a = new RangeGroup([0,5], {type:IntType});
	const b = new RangeGroup([0,10], {type:IntType});
	const c = new RangeGroup([[0,5],[7,12]], {type:IntType});
	const d = new RangeGroup([[0,5]], {type:IntType});
	expect(a.hasSymmetricDifference(a)).toBe(false);
	expect(a.hasSymmetricDifference(c)).toBe(true);
	expect(a.hasSymmetricDifference(b)).toBe(true);
	expect(a.hasSymmetricDifference(d)).toBe(false);
	expect(a.isEqual(b)).toBe(false);
	expect(a.isEqual(d)).toBe(true);
});
test("clear", set_operation.bind(null, "clear", "toCleared", null, []));
test("filter", () => {
	const a = new RangeGroup([{start:0,end:10,a:5,b:null},{start:11,end:12,a:6,b:0},{start:13,end:15,a:null,b:2}], {type:IntType});
	const didChange = diffChanged(a);
	// these methods should not mutate
	const c = a.toFiltered((r) => r.b !== null);
	didChange(a);
	expect(c.ranges).toEqual([{start:11,end:12,a:6,b:0},{start:13,end:15,a:null,b:2}], {type:IntType});
	// bool method
	const d = a.hasFilter((r) => r.b !== null);
	didChange(a);
	expect(d).toBe(true);
	const e = a.hasFilter((r) => r.a > 7);
	didChange(a);
	expect(e).toBe(false);
	// mutating method
	a.filter(r => r.a !== null && r.b !== null);
	expect(a.ranges).toEqual([{start:11,end:12,a:6,b:0}], {type:IntType});
});
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
test("copy", () => {
	const cases = [[], [[0,5],[7,12]]];
	for (const c of cases){
		const a = new RangeGroup(c, {type:IntType});
		const cache = structuredClone(a.ranges);
		const b = a.copy();
		expect(a.isEqual(b)).toBe(true);
		expect(a.ranges === b.ranges).toBe(false);
		// verify its a copy
		for (const r of b.ranges)
			r.modify = true;
		expect(a.ranges).toEqual(cache);
	}
});
test("subset/superset", () => {
	const a = new RangeGroup([[0,5,true],[10,15,false,true],[20,30]], {type:IntType});
	const b = new RangeGroup([[1,5],[10,14],[20,30]], {type:IntType});
	expect(b.isSubset(a)).toBe(true);
	expect(a.isSuperset(b)).toBe(true);
	const c = new RangeGroup([[1,4],[10,14],[20,30]], {type:IntType});
	expect(c.isProperSubset(a)).toBe(true);
	expect(a.isProperSuperset(c)).toBe(true);
	const d = new RangeGroup([[1,4],[10,11],[20,34]], {type:IntType});
	expect(d.isSubset(a)).toBe(false);
	expect(a.isSuperset(d)).toBe(false);
});

test("search randomized", () => {
	const samples = 100;
	for (let s=0; s<samples; s++){
		const [a,b] = rand_args();
		let prev_b = -1;
		for (let i=-7; i<=108; i++){
			// console.log("sample:", s, i);
			const res = a.search(i);
			const cur_b = b.values.indexOf(i, prev_b+1);
			expect(res.has).toEqual(cur_b !== -1);
			// exclusive should give same results
			const res_sexcl = a.search(i-1, {end:false, excl:true});
			const res_eexcl = a.search(i+1, {end:true, excl:true});
			expect(res_sexcl).toEqual(res);
			expect(res_eexcl).toEqual(res);
			// correct index?
			const match = a.ranges[res.index];
			if (res.has){
				expect(IntType.compare(ComparisonModes.START, match.start, i, match.startExcl).side <= 0).toBe(true);
				expect(IntType.compare(ComparisonModes.END, match.end, i, match.endExcl).side >= 0).toBe(true);
			}
			else{
				if (match)
					expect(IntType.compare(ComparisonModes.START, match.start, i, match.startExcl).side > 0).toBe(true);
				const prev = a.ranges[res.index-1];
				if (prev)
					expect(IntType.compare(ComparisonModes.END, prev.end, i, prev.endExcl).side < 0).toBe(true);
			}
			if (cur_b !== -1)
				prev_b = cur_b;
		}
	}
});
test("search/has cases", () => {
	const a = new RangeGroup([[5,10],[15,20],[25,30],[35,40]], {type:IntType});
	expect(a.search(0,{first:-2,last:-Infinity})).toEqual({index:0,has:false,start:null,end:null});
	// returned index is based on last
	expect(a.search(0,{first:10,last:-Infinity})).toEqual({index:0,has:false,start:null,end:null});
	// last greater than length
	expect(a.search(22,{first:0,last:Infinity})).toEqual({index:2,has:false,end:{distance:1,side:1},start:{distance:-2,side:-1}});
	// bounds restrict result from being correct position
	expect(a.search(33,{first:0,last:1})).toEqual({index:2,has:false,end:{distance:12,side:1},start:null});
	expect(a.search(2,{first:2,last:3})).toEqual({index:2,has:false,start:{distance:-22,side:-1},end:null});
	// has
	expect(a.has(5)).toBe(true);
	expect(a.has(12)).toBe(false);
	// empty
	a.clear();
	expect(a.search(0,{first:0,last:-1})).toEqual({index:0,has:false,start:null,end:null});
	
});
test("binary search", () => {
	const IntBinary = CommonType.compareBinarySearch(IntType);
	const a = new RangeGroup([[5,10],[15,20],[25,30],[35,40]], {type:IntBinary});
	expect(a.search(11)).toEqual({index:1,has:false,start:{distance:-1,side:-1},end:{distance:0,side:1}});
	expect(a.search(12)).toEqual({index:1,has:false,start:{distance:-1,side:-1},end:{distance:1,side:1}});
});
test("size", () => {
	const a = new RangeGroup([[5,10],[15,20],[25,30],[35,40]], {type:IntType});
	expect(a.size()).toEqual(24);
});