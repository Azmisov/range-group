import IntType from "../src/types/Int.mjs";
import { ComparisonModes } from "../src/RangeGroup.mjs";

test("IntType iterate", () => {
	for (let i=0; i<=3; i++){
		const startExcl = Boolean(i & 0b1);
		const endExcl = Boolean(i & 0b10);
		for (let j=0; j<2; j++){
			const forward = !j;
			const start = 4 + startExcl;
			const end = 10 - endExcl;
			const arr = Array.from(IntType.iterate({start:4,end:10,startExcl,endExcl}, !forward));
			expect(arr).toHaveLength(10-4+1-startExcl-endExcl);
			expect(arr[0]).toBe(forward ? start : end);
			expect(arr.at(-1)).toBe(forward ? end : start);
		}
	}
	let arr = Array.from(IntType.iterate({start:4,end:4,startExcl:true}));
	expect(arr).toHaveLength(0);
	// undefined excl value
	arr = Array.from(IntType.iterate({start: 0, end: 5}));
	expect(arr).toEqual([0,1,2,3,4,5]);
});
test("IntType compare", () => {
	expect(IntType.compare(ComparisonModes.START, -12, -11, false, false)).toEqual({distance:0,side:-1});
	expect(IntType.compare(ComparisonModes.START, -11, -12, false, false)).toEqual({distance:0,side:1});
	expect(IntType.compare(ComparisonModes.START, -12, -11, true, false)).toEqual({distance:0,side:0});
	expect(IntType.compare(ComparisonModes.START, -13, -11, true, false)).toEqual({distance:0,side:-1});
	expect(IntType.compare(ComparisonModes.START, -13, -11, false, true)).toEqual({distance:-2,side:-1});
});
test("IntType size", () => {
	expect(IntType.size({start:4,end:5})).toBe(2);
	expect(IntType.size({start:4,end:6})).toBe(3);
	expect(IntType.size({start:4,end:6,startExcl:true,endExcl:true})).toBe(1);
	expect(IntType.size({start:-6,end:-4,startExcl:false,endExcl:true})).toBe(2);
});