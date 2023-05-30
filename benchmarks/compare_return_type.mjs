/** Want to see what kind of format to use for the compare/distance method of RangeType.
 * Is having a signed -0,null,+0 worth it? or is it better to just return a tuple with the 
 * value + sign? If returning a tuple, is array or object return value better?
 * 
 * Results node v18.12: returning object is the fastest, but they are all very very close.
 * Object is the most friendly interface, so works out well in any case.
 */

import Benchmark from "benchmark";
const suite = new Benchmark.Suite;

const classified = {
	less: 0,
	greater: 0,
	equal: 0,
	merge_left: 0,
	merge_right: 0
};


function rand_int(min, max){
	// generate random integer
	return Math.floor(Math.random()*(max-min+1))+min;
}

function ret_obj(a,b){
	//4-3 -> 0; 3-4 -> 0
	let distance = a-b;
	const side = Math.sign(distance);
	distance -= side;
	return {distance, side};
}
function ret_arr(a,b){
	let distance = a-b;
	const side = Math.sign(distance);
	distance -= side;
	return [distance, side];
}
function ret_null(a,b){
	let distance = a-b;
	const side = Math.sign(distance);
	distance -= side;
	if (!distance){
		if (side < 0) return -0;
		if (side > 0) return 0;
		return null;
	}
	return distance;
}

suite.add("obj", function(){
	// fastest
	const o = ret_obj(rand_int(1,10), rand_int(1,10));
	if (!o.distance){
		if (o.side === 0) classified.equal++;
		else if (o.side === -1) classified.merge_left++;
		else classified.merge_right++;
	}
	else if (o.distance < 0)	
		classified.less++;
	else classified.greater++;
})
.add("arr", function(){
	const o = ret_arr(rand_int(1,10), rand_int(1,10));
	if (!o[0]){
		if (o[1] === 0) classified.equal++;
		else if (o[1] === -1) classified.merge_left++;
		else classified.merge_right++;
	}
	else if (o[0] < 0)	
		classified.less++;
	else classified.greater++;
})
.add("null", function(){
	const o = ret_null(rand_int(1,10), rand_int(1,10));
	if (!o){
		if (o === null)
			classified.equal++;
		else if (Object.is(o, -0))
			classified.merge_left++;
		else classified.merge_right++;
	}
	else if (o < 0)
		classified.less++;
	else classified.greater++;
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


console.log(classified);