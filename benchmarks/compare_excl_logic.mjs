/** For distance/comparison functions on continuous types, what is the best calculation to get side?
 * Tested node v18.12; identical speed
*/
import Benchmark from "benchmark";
const suite = new Benchmark.Suite;

let tot = 0;

function rand_int(min, max){
	// generate random integer
	return Math.floor(Math.random()*(max-min+1))+min;
}

suite.add("simple", function(){
	const aExcl = rand_int(0,1) ? true : undefined;
	const bExcl = rand_int(0,1) ? true : undefined;
	const mode = rand_int(0,3);
	let side = Math.sign(
		(aExcl ? 1 - ((mode & 0b1) << 1) : 0) -
		(bExcl ? 1 - (mode & 0b10) : 0)
	);
	tot += side;
})
.add("enhanced", function(){
	// fastest
	const aExcl = rand_int(0,1) ? true : undefined;
	const bExcl = rand_int(0,1) ? true : undefined;
	const mode = rand_int(0,3);
	let side = 0;
	if (aExcl || bExcl){
		// start_end or end_start mode
		if ((mode + 1) & 0b10)
			side = (mode & 0b10) - 1;
		// start/end mode; exclusion can cancel eachother out;
		// bitwise xor converts end to start mode, while also casting excl to integer
		else
			side = (bExcl^(mode >> 1)) - (aExcl^(mode & 0b1));
	}
	tot += side;
})
// add listeners
.on('cycle', function(event) {
	console.log(String(event.target));
})
.on('complete', function() {
	console.log('Fastest is ' + this.filter('fastest').map('name'));
})
// run async
.run({ 'async': false });

console.log(tot);