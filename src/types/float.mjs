/** Gets next floating point number. Using a factory, since it needs to create the typed
 * arrays, which might not be supported in older browsers.
 * Minorly adapted from: https://stackoverflow.com/a/72185420/379572
 * @private
 */ 
let _cached_next_after = null;
function createNextAfter(){
	if (!_cached_next_after){
		const f64 = new Float64Array(1)
		const b64 = new BigInt64Array(f64.buffer);
		_cached_next_after = function(start, direction){
			// Branch to descending case first as it is more costly than ascending
			// case due to start != 0.0d conditional.
			if (start > direction) {
				// descending
				if (start !== 0) {
					f64[0] = start;
					const transducer = b64[0];
					b64[0] = transducer + (transducer > 0n ? -1n : 1n);
					return f64[0];
				} else {
					// start == 0.0d && direction < 0.0d
					return -Number.MIN_VALUE;
				}
			} else if (start < direction) {
				// ascending
				// Add +0.0 to get rid of a -0.0 (+0.0 + -0.0 => +0.0)
				// then bitwise convert start to integer.
				f64[0] = start + 0;
				const transducer = b64[0];
				b64[0] = transducer + (transducer >= 0n ? 1n : -1n);
				return f64[0];
			} else if (start == direction) {
				return direction;
			} else {
				// isNaN(start) || isNaN(direction)
				return start + direction;
			}
		}
	}
	return _cached_next_after;
}

/** Generate a comparison function for numbers
 * @param {boolean} [asc=true] ascending sort, or `false` for descending
 * @param {boolean} [nan=false] include logic to place NaN's at end of array (which matches
 *  JavaScript's default `sort` behavior of placing `undefined` at end)
 * @param {boolean | number} [dedekind=false] Since we're dealing with ranges, two ranges should be
 *  combined if there are no numbers in between: e.g. no [Dedekind
 *  cut](https://en.wikipedia.org/wiki/Dedekind_cut) can be performed for that number type. For
 *  integers, you might set this to 1. For floats, set this to some epsilon; otherwise, `true` will
 *  use a special function that detects whether there are no floating point numbers representable
 *  in between. Set to falsey (zero/false) to only return `0` for equality. Note the `dedekind`
 * 	option only takes effect for {@link ComparisonModes.END_START}.
 * @returns {RangeComparison}
 */
function compare_numbers({asc=true, nan=false, dedekind=false}={}){
	const base = asc ? (a,b) => a-b : (a,b) => b-a;
	let ewrap = base;
	if (dedekind){
		if (dedekind === true){
			const next_after = createNextAfter();
			ewrap = (a,b,m) => {
				if (n === ComparisonModes.END_START && next_after(a,b) === b)
					return 0;
				return base(a,b);
			};
		}
		else{
			ewrap = (a,b,m) => {
				if (m === ComparisonModes.END_START && Math.abs(a-b) <= epsilon)
					return 0;
				return base(a,b);
			}
		}
	}
	const nwrap = !nan ? ewrap : (a,b,m) => {
		// always at end, regardless of sort order
		if (isNaN(a)) return 1;
		if (isNaN(b)) return -1;
		return ewrap(a,b,m);
	};
	return nwrap;
}