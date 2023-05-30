/** For distance/comparison functions, does branchless logic make any difference?
 * Tested node v18.12; branchless is a little faster, but not by a whole lot
*/
import Benchmark from "benchmark";
const suite = new Benchmark.Suite;

let a = 0, b = 0;

function rand_int(min, max){
	// generate random integer
	return Math.floor(Math.random()*(max-min+1))+min;
}

suite.add("branched", function(){
	const aExcl = rand_int(0,1) ? true : undefined;
	const bExcl = rand_int(0,1) ? true : undefined;
	const mode = rand_int(0,3);
	if (aExcl)
		a += mode & 0b1 ? -1 : 1;
	if (bExcl)
		b += mode & 0b10 ? -1 : 1;
})
.add("branchless", function(){
	// fastest
	const aExcl = rand_int(0,1) ? true : undefined;
	const bExcl = rand_int(0,1) ? true : undefined;
	const mode = rand_int(0,3);
	if (aExcl)
		a += 1 - 2*(mode & 0b1);
	if (bExcl)
		b += 1 - (mode & 0b10);
})
.add("branchless shift", function(){
	// fastest (slightly better than branchless)
	const aExcl = rand_int(0,1) ? true : undefined;
	const bExcl = rand_int(0,1) ? true : undefined;
	const mode = rand_int(0,3);
	if (aExcl)
		a += 1 - ((mode & 0b1) << 1);
	if (bExcl)
		b += 1 - (mode & 0b10);
})
.add("super branchless", function(){
	const aExcl = rand_int(0,1) ? true : undefined;
	const bExcl = rand_int(0,1) ? true : undefined;
	const mode = rand_int(0,3);
	a += !!aExcl*(1 - 2*(mode & 0b1));
	b += !!bExcl*(1 - (mode & 0b10));
})
// add listeners
.on('cycle', function(event) {
	console.log(String(event.target));
})
.on('complete', function() {
	console.log('Fastest is ' + this.filter('fastest').map('name'));
})
// run async
.run({ 'async': true });