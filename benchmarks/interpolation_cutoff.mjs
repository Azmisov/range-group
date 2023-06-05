/* Figure out a good cutoff for switching from interpolation search to linear.
	RangeGroup.INTERPOLATION_CUTOFF
*/
import { performance } from 'node:perf_hooks';
import RangeGroup from "../src/RangeGroup.mjs";
import RealType from "../src/types/Real.mjs";
import seed from "seed-random";
const rand = seed("interpolation_cutoff");

function rand_int(min, max){
	// generate random integer
	return Math.floor(rand()*(max-min+1))+min;
}

/** Sets up a random RangeGroup. Ranges are between [0,1], with distribution tuned by args. We
 * specify maximum params, since that's what you'll get if there were no overlaps.
 * @param {number} max_ranges maximum number of ranges in group, if there are no overlaps
 * @param {number} max_coverage maximum percentage of the [0,1] range that should be covered;
 *  distribution is linear between [0,max_coverage], with some other PDF transformation to
 *  account for overlapping ranges
 * @returns {RangeGroup}
 */
function random_group(max_ranges, max_coverage){
	const size = max_coverage/max_ranges;
	const ranges = [];
	for (let i=0; i<max_ranges; i++){
		// this gives you a linear distribution of sizes between [0,size]
		const size_i = rand()*size;
		const offset = rand()*(1-size_i);
		ranges.push({start:offset, end:offset+size_i});
	}
	return new RangeGroup(ranges, {type: RealType});
}

let _no_optimize = 0;

function test(cutoff){
	const COVERAGE = .5;
	RangeGroup.INTERPOLATION_CUTOFF = cutoff;
	for (let sample=0; sample<100000; sample++){
		const a_size = rand_int(0,20);
		const b_size = rand_int(0,20);
		const a = random_group(a_size, COVERAGE);
		const b = random_group(b_size, COVERAGE);
		const res = a.diff(b, {filter:false, bool:false, copy:true, track_sources:true, self_union:false});
		_no_optimize += res.ranges.length
	}
}

/* Tests:
	coverage, a_size, b_size_random, sample_range, best result
	.5, 15, (0,100), (0,49,1), 12
	.5, 15, (0,10000), (0,999,10), no clear pattern
	.5, 5, 1000, (0,1000,10), between [60,720]
	.1, 5, 30, (0,100,2), 12
	.05, 2, 24, (0,30,1), 8/14/22 all about similar
	.05, 10, 1024, (0,20,1), 11
	.5, (0,20), (0,20), (0,25,1), 3/6/9/12 similar, 6 being best

	So the bigger tests its harder to tell, but on smaller tests it seems to be around ~12. Always
	doing linear search (Infinity) is always slower than always doing interpolation search (0), but
	in between it can be difficult to pick it out. There's just a lot of factors going into whether
	it will speed it up I guess. The first test I did had the clearest graph, where we say a kind of
	bowl shape between 0(peak), 12(trough), and 49(peak). And that is what I expected to see. I'll
	go with 12 as the cutoff for now.
*/

for (let i=0; i<=25; i+=1){
	const s = performance.now();
	test(i);
	const duration = performance.now() - s;
	console.log(`${i}\t${duration}`);
}

// for (let i of [0,12,50,Infinity]){
// 	const s = performance.now();
// 	test(i);
// 	const duration = performance.now() - s;
// 	console.log(`${i}\t${duration}`);
// }

console.log("dummy:", _no_optimize);


