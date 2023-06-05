/** How to compute count of unicode code points in string?
 * Tested node v18.12; loop fastest
*/
import Benchmark from "benchmark";
const suite = new Benchmark.Suite;

let mismatch = {
	array: 0,
	spread: 0,
	loop: 0
}

function rand_int(min, max){
	// generate random integer
	return Math.floor(Math.random()*(max-min+1))+min;
}

function rand_string(){
	const size = rand_int(0,10);
	let str = "";
	for (let i=0; i<size; i++)
		str += String.fromCodePoint(rand_int(0,0x10FFFF)); // 0xffff BMP
	return str;
}

suite.add("Array.from", function(){	
	const r = rand_string();
	const l = Array.from(r).length;
	mismatch.array += l !== r.length;
})
.add("spread", function(){
	const r = rand_string();
	const l = [...r].length;
	mismatch.spread += l !== r.length;
})
.add("loop", function(){
	const r =  rand_string();
	let l = 0;
	for (const _ of r)
		l++;
	mismatch.loop += l !== r.length;
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

console.log(mismatch);