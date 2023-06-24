import { Sampler, RangeGroup, RealType, FloatNormType, CommonType } from "../src/barrel.mjs";

test("real compare", () => {
	// number line is continuous/infinite, so exclusion doesn't change distance
	for (let mode=0; mode<=0b11; mode++){
		for (let excl=0; excl<=0b11; excl++){
			expect(RealType.compare(mode, 1.5, -2.3, excl & 0b1, excl & 0b10)).toEqual({distance:3.8,side:1});
			expect(RealType.compare(mode, -2.3, 1.5, excl & 0b1, excl & 0b10)).toEqual({distance:-3.8,side:-1});
		}
	}
	// exclusion should only affect side when distance is zero
	expect(RealType.compare(0, 2.5, 2.5, false, false)).toEqual({distance:0,side:0});
	expect(RealType.compare(0, 2.5, 2.5, true, true)).toEqual({distance:0,side:0});
	expect(RealType.compare(0, 2.5, 2.5, true, false)).toEqual({distance:0,side:1});
	expect(RealType.compare(0, 2.5, 2.5, false, true)).toEqual({distance:0,side:-1});

	expect(RealType.compare(1, 2.5, 2.5, false, false)).toEqual({distance:0,side:0});
	expect(RealType.compare(1, 2.5, 2.5, true, true)).toEqual({distance:0,side:-1});
	expect(RealType.compare(1, 2.5, 2.5, true, false)).toEqual({distance:0,side:-1});
	expect(RealType.compare(1, 2.5, 2.5, false, true)).toEqual({distance:0,side:-1});

	expect(RealType.compare(2, 2.5, 2.5, false, false)).toEqual({distance:0,side:0});
	expect(RealType.compare(2, 2.5, 2.5, true, true)).toEqual({distance:0,side:1});
	expect(RealType.compare(2, 2.5, 2.5, true, false)).toEqual({distance:0,side:1});
	expect(RealType.compare(2, 2.5, 2.5, false, true)).toEqual({distance:0,side:1});

	expect(RealType.compare(3, 2.5, 2.5, false, false)).toEqual({distance:0,side:0});
	expect(RealType.compare(3, 2.5, 2.5, true, true)).toEqual({distance:0,side:0});
	expect(RealType.compare(3, 2.5, 2.5, true, false)).toEqual({distance:0,side:-1});
	expect(RealType.compare(3, 2.5, 2.5, false, true)).toEqual({distance:0,side:1});
});

// Needed since we're dealing with floating point testing, where robustness is paramount
// https://scicomp.stackexchange.com/a/20379/8196
function robust_mean(a, b){
	if (Math.max(Math.abs(a), Math.abs(b)))
		return a/2 + b/2;
	return (a+b)/2;
}
// two floats are adjacent? e.g. no float in between?
function are_adjacent(a, b){
	expect(a).not.toBe(b);
	const middle = robust_mean(a, b);				
	expect(middle === a || middle === b).toBe(true);
}
function* random_floats(vector_size=1, samples_per_exponent=50){
	// max exponent is 1023, so add one;
	// distribution of floats halves each exponent, so double exponent when incrementing
	for (let exp=0; exp<=1024; exp = (!exp ? 1 : exp*2)){
		for (let sample=0; sample<samples_per_exponent; sample++){
			const vec = [];
			while (vec.length < vector_size){
				let base = Math.random()*(1 << exp);
				if (Math.random() > .5)
					base = -base;
				vec.push(base);
			}
			yield vec;			
		}
	}

}

test("float auto normalization", () => {
	// Not really any way to test this, since the only Javascript method I know of doing it
	// is what is implemented in FloatNorm; can't put preset test cases, since the binary conversion
	// once again is using the same as whats implemented. Here, I will just test that there is
	// no value halfway between the floats; 

	function check(base){
		const r = {};
		// set start
		FloatNormType.setStart(r, base, true);
		if (base === Infinity)
			expect(r.start).toBe(base);
		else{
			expect(r.start).toBeGreaterThan(base);
			are_adjacent(r.start, base);
		}
		// set end (reverse direction)
		FloatNormType.setEnd(r, base, true);
		if (base === -Infinity)
			expect(r.end).toBe(base);
		else{
			expect(r.end).toBeLessThan(base);
			are_adjacent(r.end, base);
		}
	}

	for (const [base] of random_floats(1))
		check(base);
	check(Infinity);
	check(-Infinity);
	check(Number.MIN_VALUE);
	check(Number.MAX_VALUE);
	check(0);
	check(-0);
	expect(FloatNormType.setStart({}, NaN, true).start).toBe(NaN);
});

test("float iterate", () => {
	function try_iterate(range, reverse, limit=10){
		let prev = null;
		let i = 0;
		for (const v of FloatNormType.iterate(range, reverse)){
			if (prev !== null){
				if (reverse)
					expect(prev).toBeGreaterThan(v);
				else expect(prev).toBeLessThan(v);
				are_adjacent(prev, v);
			}
			prev = v;
			if (++i == limit)
				break;
		}
		return i;
	}
	function check(a, b){
		try_iterate(FloatNormType.create(a, b), false);
		try_iterate(FloatNormType.create(a, b), true);
		try_iterate(FloatNormType.create(-Infinity, b), false);
		try_iterate(FloatNormType.create(a, Infinity), true);
		expect(try_iterate(FloatNormType.create(a, a))).toBe(1);
		expect(try_iterate(FloatNormType.create(b, b))).toBe(1);
	}
	for (let [a,b] of random_floats(2, 10)){
		if (a > b)
			[a,b] = [b,a];
		check(a, b);
	}
	// stops on right number?
	expect(try_iterate(FloatNormType.create(0, Number.MIN_VALUE*5))).toBe(6);
});

test("float compare", () => {
	// zero distance with adjacent float
	expect(FloatNormType.compare(0, -0, Number.MIN_VALUE)).toEqual({distance:0,side:-1});
	expect(FloatNormType.compare(0, 0, Number.MIN_VALUE)).toEqual({distance:0,side:-1});
	expect(FloatNormType.compare(0, Number.MIN_VALUE, -0)).toEqual({distance:0,side:1});
	expect(FloatNormType.compare(0, Number.MIN_VALUE, 0)).toEqual({distance:0,side:1});
	expect(FloatNormType.compare(0, Infinity, Number.MAX_VALUE)).toEqual({distance:0,side:1});
	// non-zero distance if not
	const min2 = Number.MIN_VALUE*2;
	expect(FloatNormType.compare(0, min2, 0)).toEqual({distance:min2,side:1});
	expect(FloatNormType.compare(0, 0, min2)).toEqual({distance:-min2,side:-1});	
	const max2 = FloatNormType.setEnd({}, Number.MAX_VALUE, true).end;
	expect(FloatNormType.compare(0, Infinity, max2)).toEqual({distance:Infinity,side:1});
	expect(FloatNormType.compare(0, max2, Infinity)).toEqual({distance:-Infinity,side:-1});
});

test("compare epsilon", () => {
	// calculation that is not robust
	const iters = 500;
	const base = 1.56981923123;
	const exact = base*iters;
	let accum = 0;
	for (let i=0; i<iters; i++)
		accum += base;
	// float type
	const f = FloatNormType.compare(0, exact, accum);
	expect(f.distance).toBeGreaterThan(0);
	expect(f.side).toBe(1);
	// float + epsilon type
	const EpsilonType = CommonType.compareEpsilon(1e-7, FloatNormType);
	expect(EpsilonType.compare(0, exact, accum)).toEqual({distance:0,side:1});
	// verify other methods on EpsilonType also work
	expect(EpsilonType.size({start:-10.1,end:10.1})).toBe(20.2);
});

test("sample", () => {
	for (const t of [RealType, FloatNormType]){
		let g = new RangeGroup([
			{start:0,end:3,endExcl:true},
			{start:4,end:7,startExcl:true}
		], {type: t});
		let s = new Sampler(g);
		expect(s.sample(.5)).toBe(4);
		expect(s.sample(1)).toBeLessThan(7);
		expect(s.sample(0)).toBe(0);
		expect(s.sample(.25)).toBe(1.5);
	}
});