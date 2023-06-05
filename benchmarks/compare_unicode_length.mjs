/** Is optimized length comparison faster?
 * Tested node v18.12; optimized is always faster
*/
import Benchmark from "benchmark";
const suite = new Benchmark.Suite;

let tot = 0;

/** Count number of unicode code points in a string
 * @private
 */
function unicode_length(str){
	let l = 0;
	for (const _ of str)
		l++;
	return l;
}
function optimized(a, b){
	// with surrogate pairs, number of codepoints is between [ceil(v.length/2), v.length]
	const a_max = a.length;
	const b_max = b.length;
	if (a_max === b_max && a_max === 1)
		return 0;
	const b_min = (b_max+1) >> 1;
	// -1: a_max < b_min
	if (a_max < b_min)
		return -1;
	const a_min = (a_max+1) >> 1;
	// 1: a_min > b_max
	if (a_min > b_max)
		return 1;
	return unicode_length(a) - unicode_length(b);
}
function basic(a, b){
	return unicode_length(a) - unicode_length(b);
}

function rand_int(min, max){
	// generate random integer
	return Math.floor(Math.random()*(max-min+1))+min;
}
function rand_string(){
	const size = rand_int(0,4);
	let str = "";
	for (let i=0; i<size; i++)
		str += String.fromCodePoint(rand_int(0,0x10FFFF)); // 0xffff BMP
	return str;
}

suite.add("optimized", function(){	
	const a = rand_string();
	const b = rand_string();
	tot += optimized(a, b)
})
.add("basic", function(){
	const a = rand_string();
	const b = rand_string();
	tot += basic(a, b)
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