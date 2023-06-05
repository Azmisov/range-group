import UnicodeType from "../src/types/Unicode.mjs";

test.only("UnicodeType iterate/size", () => {
	let range = {start:"ab",end:"cd"};
	const combos = Array.from(UnicodeType.iterate(range, true));
	const size = UnicodeType.size(range);
	expect(combos).toEqual(["ab","ac","ad","bb","bc","bd","cb","cc","cd"]);
	expect(size).toEqual(combos.length);

	range.startExcl = true;
	expect(Array.from(UnicodeType.iterate(range, true))).toEqual(["ac","ad","bb","bc","bd","cb","cc","cd"]);
	expect(UnicodeType.size(range)).toEqual(combos.length-1);

	range.endExcl = true;
	expect(Array.from(UnicodeType.iterate(range, false))).toEqual(["cc","cb","bd","bc","bb","ad","ac"]);
	expect(UnicodeType.size(range)).toEqual(combos.length-2);
});