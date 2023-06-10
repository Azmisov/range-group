import { StringRange as SR } from "../src/barrel.mjs";

test("1d ranges", () => {
	let o1 = Array.from(SR.toRanges1d({start:"ab",end:"cd"}));
	expect(o1).toEqual([{start:"ab",end:"ad"}, {start:"bb",end:"bd"}, {start:"cb",end:"cd"}]);
	let o2 = Array.from(SR.toRanges1d({start:"x\u{1f606}",end:"x\u{1f616}"}));
	expect(o2).toEqual([{start:"x\u{1f606}",end:"x\u{1f616}"}]);
	let o3 = Array.from(SR.toRanges1d({start:"xx",end:"x\u{1f616}"}));
	expect(o3).toEqual([{start:"xx",end:"x\u{1f616}"}]);
	let o4 = Array.from(SR.toRanges1d({start:"abcd",end:"bcef"}));
	expect(o4).toEqual([
		{start:"abcd",end:"abcf"},
		{start:"abdd",end:"abdf"},
		{start:"abed",end:"abef"},
		{start:"accd",end:"accf"},
		{start:"acdd",end:"acdf"},
		{start:"aced",end:"acef"},
		{start:"bbcd",end:"bbcf"},
		{start:"bbdd",end:"bbdf"},
		{start:"bbed",end:"bbef"},
		{start:"bccd",end:"bccf"},
		{start:"bcdd",end:"bcdf"},
		{start:"bced",end:"bcef"}
	]);
	// with exclusion
	let o5 = Array.from(SR.toRanges1d({start:"abcd",end:"acef",startExcl:true,endExcl:true}));
	expect(o5).toEqual([
		{start:"abcd",end:"abcf",startExcl:true},
		{start:"abdd",end:"abdf"},
		{start:"abed",end:"abef"},
		{start:"accd",end:"accf"},
		{start:"acdd",end:"acdf"},
		{start:"aced",end:"acef",endExcl:true},
	]);
	// exclusion that eliminates value
	let o6 = Array.from(SR.toRanges1d({start:"abc",end:"bcc",startExcl:true,endExcl:true}));
	expect(o6).toEqual([
		// {start:"abc",end:"abc"},
		{start:"acc",end:"acc"},
		{start:"bbc",end:"bbc"},
		// {start:"bcc",end:"bcc"},
	]);
});

test("size", () => {
	expect(SR.size({start:"\u{1}\u{15}",end:"\u{a}\u{64}"})).toBe(10);
	expect(SR.size({start:"\u{1}\u{15}",end:"\u{a}\u{64}"}, true)).toBe(800);
	expect(SR.size({start:"abc",end:"bcc",startExcl:true,endExcl:true})).toBe(2);
	expect(SR.size({start:"abc",end:"bcc",endExcl:true})).toBe(3);
});