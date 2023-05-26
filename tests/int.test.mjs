import IntType from "../src/types/int.mjs";
import { ComparisonModes } from "../src/RangeGroup.mjs";

test("IntType iterate", () => {
	for (let i=0; i<=3; i++){
		const startExcl = Boolean(i & 0b1);
		const endExcl = Boolean(i & 0b10);
		for (let j=0; j<2; j++){
			const forward = !j;
			const start = 4 + startExcl;
			const end = 10 - endExcl;
			const arr = Array.from(IntType.iterate({start:4,end:10,startExcl,endExcl}, forward));
			expect(arr).toHaveLength(10-4+1-startExcl-endExcl);
			expect(arr[0]).toBe(forward ? start : end);
			expect(arr.at(-1)).toBe(forward ? end : start);
		}
	}
	let arr = Array.from(IntType.iterate({start:4,end:4,startExcl:true}, true));
	expect(arr).toHaveLength(0);
	// undefined excl value
	arr = Array.from(IntType.iterate({start: 0, end: 5}, true));
	expect(arr).toEqual([0,1,2,3,4,5]);
});
test("IntType compare", () => {
	// normal compare, no exclusion
	for (const k in ComparisonModes){
		const m = ComparisonModes[k];
		if (m == ComparisonModes.END_START)
			continue;
		expect(IntType.compare(m, -12, -11, false, false)).toBeLessThan(0);
		expect(IntType.compare(m, 5, 5, false, false)).toBe(0);
		expect(IntType.compare(m, 5, 4, false, false)).toBeGreaterThan(0);
	}
});