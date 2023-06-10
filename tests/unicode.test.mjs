import {
	UnicodeHelpers as UH
} from "../src/barrel.mjs";

test("length", () => {
	expect(UH.length("💩")).toBe(1);
	expect(UH.length("\u{0047}\u{d7fe}")).toBe(2);
	expect(UH.length("\u{0047}\u{d7fe}\u{d801}")).toBe(3);
	expect(UH.length("\u{0047}\u{d7fe}\u{d801}\u{d801}")).toBe(4);
	expect(UH.length("\u{0047}\u{d7fe}\u{d801}\u{dc01}")).toBe(3);
	expect(UH.length("\u{0047}\u{d7fe}\u{dc01}\u{d801}")).toBe(4);
});
test("last codepoint", () => {
	expect(UH.lastCodepoint("💩")).toBe(0x0001f4a9);
	expect(UH.lastCodepoint("👨‍👩‍👧")).toBe(0x0001f467);
	expect(UH.lastCodepoint("\u{0047}\u{d7fe}")).toBe(0xd7fe);
	expect(UH.lastCodepoint("\u{0047}\u{d7fe}\u{d801}")).toBe(0xd801);
	expect(UH.lastCodepoint("\u{0047}\u{d7fe}\u{d801}\u{d801}")).toBe(0xd801);
	expect(UH.lastCodepoint("\u{0047}\u{d7fe}\u{d801}\u{dc01}")).toBe(0x00010401);
	expect(UH.lastCodepoint("\u{0047}\u{d7fe}\u{dc01}\u{d801}")).toBe(0xd801);
});
test("pairwise iterate", () => {
	const a = "💩x💩x💩💩x";
	const b = "x💩x💩xxx";
	expect(UH.length(a)).toBe(UH.length(b));
	const out = Array.from(UH.pairwiseIterate(a, b));
	expect(out).toEqual([
		[0x0001f4a9, 0x78],
		[0x78, 0x0001f4a9],
		[0x0001f4a9, 0x78],
		[0x78, 0x0001f4a9],
		[0x0001f4a9, 0x78],
		[0x0001f4a9, 0x78],
		[0x78, 0x78]
	]);
});
test("compare length", () => {
	expect(UH.compareLength("💩","x")).toBe(0);
	expect(UH.compareLength("x","💩")).toBe(0);
	expect(UH.compareLength("💩","xx")).toBeLessThan(0);
	expect(UH.compareLength("xx","💩")).toBeGreaterThan(0);
	expect(UH.compareLength("xx","yyyyy")).toBeLessThan(0);
	expect(UH.compareLength("yyyyy","xx")).toBeGreaterThan(0);
	expect(UH.compareLength("y","x")).toBe(0);
});
test("utf16 length", () => {
	expect(UH.utf16Length(128169)).toBe(2);
	expect(UH.utf16Length(41)).toBe(1);
});