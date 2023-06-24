import { DateFloorNormType, DateFloorType, DateFloorNormType as N,
	RangeGroup, Sampler
} from "../src/barrel.mjs";

test("create", () => {
	const base = new Date("2023-06-08T01:33:59.380Z");
	const out = {
		Second: "2023-06-08T01:33:59Z",
		Minute: "2023-06-08T01:33:00Z",
		Hour: "2023-06-08T01:00:00Z",
		Day: "2023-06-08T00:00:00Z"
	};
	for (const k in out){
		expect(N[k].setStart({}, base).start).toEqual(new Date(out[k]));
		expect(N[k].setEnd({}, base).end).toEqual(new Date(out[k]));
	}
	const out_norm = {
		// start norm, end norm
		Second: ["2023-06-08T01:34:00Z","2023-06-08T01:33:58Z"],
		Minute: ["2023-06-08T01:34:00Z","2023-06-08T01:32:00Z"],
		Hour: ["2023-06-08T02:00:00Z","2023-06-08T00:00:00Z"],
		Day: ["2023-06-09T00:00:00Z","2023-06-07T00:00:00Z"]
	}
	for (const k in out_norm){
		expect(N[k].setStart({}, base, true).start).toEqual(new Date(out_norm[k][0]));
		expect(N[k].setEnd({}, base, true).end).toEqual(new Date(out_norm[k][1]));
	}
});

test("copy", () => {
	for (const k in DateFloorType){
		const r = {start: new Date("12:30 1/1"), end: new Date("12:35 1/2")};
		const c = DateFloorType[k].copy(r);
		expect(r.start).not.toBe(c.start);
		expect(r.end).not.toBe(c.end);
		expect(r).toEqual(c);
	}
});

test("size", () => {
	const inc = {
		Day: 3,
		Hour: 2,
		Minute: 37,
		Second: 12,
		Millisecond: 911
	};
	const units = {
		Day: 24,
		Hour: 60,
		Minute: 60,
		Second: 1000,
		Millisecond: 1,
	};
	let accum = 0;
	for (const k in units){
		inc[k] += accum;
		accum = inc[k] * units[k];
	}
	const start = new Date("00:00 1/1 UTC+0");
	const end = new Date(+start + accum);
	const r = {start, end};
	for (const k in inc){
		if (k === "Millisecond") continue;
		// add one to catch end
		expect(DateFloorType[k].size(r)).toBe(inc[k]+1);
	}
});

test("compare", () => {
	expect(DateFloorType.Minute.compare(0,
		new Date("12:35:16.12 1/1 UTC+0"),
		new Date("12:36:34.933 1/1 UTC+0"),
	)).toEqual({distance:0,side:-1});
	expect(DateFloorType.Second.compare(0,
		new Date("12:36:34.933 1/1 UTC+0"),
		new Date("12:35:16.12 1/1 UTC+0"),
		true, true
	)).toEqual({distance:(34+(60-16+1))-2,side:1});
});

test("iterate", () => {
	for (const T of [DateFloorType, DateFloorNormType]){
		const r = T.Minute.create(
			new Date("12:35:16.12 1/1 UTC+0"),
			new Date("12:42:34.933 1/1 UTC+0"),
			true
		);
		const res = [
			"12:36 1/1 UTC+0",
			"12:37 1/1 UTC+0",
			"12:38 1/1 UTC+0",
			"12:39 1/1 UTC+0",
			"12:40 1/1 UTC+0",
			"12:41 1/1 UTC+0",
			"12:42 1/1 UTC+0",
		].map(v => new Date(v));
		expect(Array.from(T.Minute.iterate(r))).toEqual(res);
		res.reverse();
		expect(Array.from(T.Minute.iterate(r, true))).toEqual(res);
	}
});

test("sample", () => {
	for (const T of [DateFloorType, DateFloorNormType]){
		let g = new RangeGroup([
			[new Date("4:30 1/1"),new Date("4:30 1/4"),false,true],
			[new Date("4:30 1/5"),new Date("4:30 1/8"),true]
		], {type: T.Hour});
		let s = new Sampler(g);
		expect(s.sample(.5)).toEqual(new Date("5:00 1/5"));
		expect(+s.sample(1) <= +new Date("5:00 1/8")).toBe(true);
		expect(s.sample(0)).toEqual(new Date("4:00 1/1"));
		expect(s.sample(.25)).toEqual(new Date("16:00 1/2"));
	}
});