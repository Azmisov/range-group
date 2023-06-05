const _f64 = new Float64Array(1)
const _b64 = new BigInt64Array(_f64.buffer);
/** Gets next floating point number in a particular direction.
 * Minorly adapted from: https://stackoverflow.com/a/72185420/379572
 * @param {number} start number to modify
 * @param {number} direction modify `start` in the direction of this number; e.g. you can set this
 * 	to +/-Infinity to increment/decrement respectively.
 * @returns {number}
 * @private
 */
function next_after(start, direction){
	// Branch to descending case first as it is more costly than ascending
	// case due to start != 0.0d conditional.
	if (start > direction) {
		// descending
		if (start !== 0) {
			_f64[0] = start;
			const transducer = _b64[0];
			_b64[0] = transducer + (transducer > 0n ? -1n : 1n);
			return _f64[0];
		} else {
			// start == 0.0d && direction < 0.0d
			return -Number.MIN_VALUE;
		}
	} else if (start < direction) {
		// ascending
		// Add +0.0 to get rid of a -0.0 (+0.0 + -0.0 => +0.0)
		// then bitwise convert start to integer.
		_f64[0] = start + 0;
		const transducer = _b64[0];
		_b64[0] = transducer + (transducer >= 0n ? 1n : -1n);
		return _f64[0];
	} else if (start == direction) {
		return direction;
	} else {
		// isNaN(start) || isNaN(direction)
		return start + direction;
	}
}

let x = Infinity;
let y = next_after(x, -Infinity);
let z = next_after(y, -Infinity);
console.log(x);
console.log(y);
console.log(z);
console.log(y-z);