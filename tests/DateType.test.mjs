import { DateType, DateNormType, DateFloorNormType, RangeGroup, Sampler } from "../src/barrel.mjs";

test("date create", () => {
	// should copy date, but keep it a date object
	const a = new Date("12:30 1/1");
	const b = new Date("12:35 1/2");
	const r = DateType.create(a, b);
	expect(r.start).not.toBe(a);
	expect(r.end).not.toBe(b);
	expect(r.start+"").toBe(a+"");
	expect(r.end+"").toBe(b+"");
	expect(r.start).toBeInstanceOf(Date);
	expect(r.end).toBeInstanceOf(Date);
});

test("date copy", () => {
	const r = {start: new Date("12:30 1/1"), end: new Date("12:35 1/2")};
	const c = DateType.copy(r);
	expect(r.start).not.toBe(c.start);
	expect(r.end).not.toBe(c.end);
	expect(r).toEqual(c);
});

test("date autonormalization", () => {
	const a = new Date("12:30 1/1");
	const b = new Date("12:35 1/2");
	const r = DateNormType.create(a, b, true, true);
	expect(r.start).toBeInstanceOf(Date);
	expect(r.end).toBeInstanceOf(Date);
	expect(+r.start).toBeGreaterThan(+a);
	expect(+r.end).toBeLessThan(+b);
	expect(+r.start).toBe(+a+1);
	expect(+r.end).toBe(+b-1);	
});

test("date size", () => {
	const r = {start: new Date("12:30 1/1"), end: new Date("12:35 1/2"), endExcl:true};
	expect(DateType.size(r)).toBe((24*60+5)*60*1000);
});

test("date compare", () => {
	expect(DateNormType.compare(0, new Date(1), new Date(0))).toEqual({distance:0,side:1});
	expect(DateNormType.compare(0, new Date(0), new Date(2))).toEqual({distance:-1,side:-1});
});

test("date iterate", () => {
	const a = new Date("12:30 1/1");
	const b = new Date("12:30:00.01 1/1");
	const arr = Array.from(DateType.iterate({start:a,end:b,startExcl:true}, true));
	const arr2 = [];
	for (let i=0; i<10; i++)
		arr2.push(new Date(+b-i));
	expect(arr).toEqual(arr2);
});

test("sample", () => {
	for (const t of [DateType, DateNormType]){
		let g = new RangeGroup([
			[new Date("4:30 1/1"),new Date("4:30 1/4"),false,true],
			[new Date("4:30 1/5"),new Date("4:30 1/8"),true]
		], {type: t});
		let s = new Sampler(g);
		expect(s.sample(.5)).toEqual(new Date("4:30:00.001 1/5"));
		expect(+s.sample(1) <= +new Date("4:30 1/8")).toBe(true);
		expect(s.sample(0)).toEqual(new Date("4:30 1/1"));
		expect(s.sample(.25)).toEqual(new Date("16:30 1/2"));
	}
});