import {
	UnicodeType as UT,
	UnicodeNormType as UNT
} from "../src/barrel.mjs";

test("validate", () => {
	expect(UT.validate({start:"ab",end:"cd"})).toBe(false);
	expect(UT.validate({start:"ad",end:"ab"})).toBe(false);
	expect(UT.validate({start:"ab",end:"ac",startExcl:true,endExcl:true})).toBe(false);
});
test("iterate", () => {
	const a1 = Array.from(UT.iterate({start:"xb",end:"xd"}));
	expect(a1).toEqual(["xb","xc","xd"]);
	const a2 = Array.from(UT.iterate({start:"\u{1f600}",end:"\u{1f604}",endExcl:true}, true));
	expect(a2).toEqual(["😃","😂","😁","😀"]);
});
test("compare", () => {
	// differing string lengths
	expect(UT.compare(0, "xya", "xy")).toEqual({distance:Infinity,side:1});
	// same string length, but differing prefix lengths
	expect(UT.compare(0, "xy😃", "😃xy")).toEqual({distance:-Infinity,side:-1});
	// same string and prefix length
	expect(UT.compare(0, "xy😃", "abz")).toEqual({distance:Infinity,side:1});
	expect(UT.compare(0, "ab😃", "xyz")).toEqual({distance:-Infinity,side:-1});
	// same length and prefix
	expect(UT.compare(0, "😂x😃", "😂xA", false, true)).toEqual({distance:0x1f603-0x41-2,side:1});
	// exclusive bounds are ignored here
	expect(UNT.compare(0, "😂x😃", "😂xA", false, true)).toEqual({distance:0x1f603-0x41-1,side:1});
});
test("create, setStart, setEnd", () => {
	expect(UNT.create("😂x😀", "😂xB", true, true)).toEqual({start:"😂x😁", end:"😂xA"});
	expect(UT.create("😂x😀", "😂xB", true, true)).toEqual({start:"😂x😀", end:"😂xB", startExcl:true, endExcl:true});
});
test("size", () => {
	expect(UT.size({start:"A", end:"B", startExcl:false, endExcl:true})).toBe(1);
	expect(UT.size({start:"😂xA", end:"😂x😃", startExcl:false, endExcl:true})).toBe(0x1f603-0x41);
});