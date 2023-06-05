import { create, copy } from "./common.mjs";

/** Count number of unicode code points in a string
 * @private
 */
function unicode_length(str){
	let l = 0;
	for (const _ of str)
		l++;
	return l;
}
/** Compare the number of unicode code points in two strings
 * @returns {number} negative if a has less; 0 if equal; positive if a has more
 */
function compare_unicode_length(a, b){
	const a_max = a.length;
	const b_max = b.length;
	// optimization for single characters
	if (a_max === b_max && a_max === 1)
		return 0;
	// with surrogate pairs, number of codepoints is between [ceil(v.length/2), v.length]
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
/** Pairwise iteration of the codepoints of two equal length strings
 * @yields {number[]} tuple of codepoints [a, b]
*/
function* unicode_pairwise_iterate(a, b){
	const a_len = a.length;
	let ai = 0, bi = 0;
	while (true){
		const an = a.codePointAt(ai);
		const bn = b.codePointAt(bi);
		yield [an, bn];
		ai += 1 + (an >= 0x10000);
		if (ai >= a_len)
			return;
		bi += 1 + (an >= 0x10000);
	}
}

// https://www.unicode.org/reports/tr35/tr35.html#String_Range
// start >= end
const UnicodeType = {
	create,
	copy,
	setStart(range, start, startExcl){

	},
	setStart(range, end, endExcl){
		
	},
	*iterate(range, forward){
		/* For multi-codepoint strings, we would iterate them like a nested for loop, where each
			codepoint is another loop. E.g. the range [ac, cd] would iterate a-to-c in outer loop,
			and c-to-d for inner loop;
		*/
		// starting/ending strings and exclusion
		const bounds = Array.from(unicode_pairwise_iterate(range.start, range.end));
		const excl = [range.startExcl, range.endExcl];
		// which index in `bounds`/`excl` is the start vs end
		const start = forward^1;
		const end = start^1;
		// which direction to iterate (forward ? 1 : -1)
		const inc = (end << 1) - 1;
		// current string
		const cur = [];
		// state of each index in `cur`: -1=no iteration needed, 0=iterating, 1=reached end
		const cur_state = [];
		// how many values in cur_state still need to reach end (e.g. state == 0)
		let still_pending = 0;

		// initialize current state
		for (const b of bounds){
			const s = b[start];
			const e = b[end];
			const single = s === e;
			still_pending += single^1;
			cur_state.push(-single);
			cur.push(s);
		}

		// first string inclusive?
		if (!excl[start])
			yield String.fromCodePoint(...cur);
		// single value
		if (!still_pending)
			return;
		
		while (true){
			let dim = cur.length-1;
			while (true){
				let state = cur_state[dim];
				// next value
				if (!state){
					if ((cur[dim] += inc) === bounds[dim][end]){
						cur_state[dim] = 1;
						// last string?
						if (!--still_pending){
							// last string inclusive?
							if (!excl[end])
								yield String.fromCodePoint(...cur);
							return;
						}
					}
					yield String.fromCodePoint(...cur);
					break;
				}
				// reset dimension
				if (state > 0){
					cur_state[dim] = 0;
					cur[dim] = bounds[dim][start];
					still_pending++;
				}
				// ignore dims where state < 0
				// with still_pending counter, dim will never be zero
				dim--;
			}
		}
	},
	size(range){
		let size = 1;
		for (const [sn, en] of unicode_pairwise_iterate(range.start, range.end))
			size *= en-sn+1;
		if (range.startExcl) size--;
		if (range.endExcl) size--;
		return size;
	},
	compare(mode, a, b, aExcl, bExcl){
		/* We only measure distance if a/b lengths are equal. Otherwise, we treat as separate number lines
			that are infinite distance apart. 
		
			If multi-codepoint string and differs at non-last character, we won't compute
			distance, instead opting for binary search (distance is ). Otherwise, the last character determines
			the distance between two 

			[ad, cd][dd, zd]

		*/
		// differing string lengths we treat as separate number lines
		let side = compare_unicode_length(a, b);
		if (side)
			return {distance:side*Infinity, side};

		let sign = 0;
		let distance = 0;
		for (const [an, bn] of unicode_pairwise_iterate(a, b)){
			an-bn;
			
		}
		let ai=0, bi=0;
		while (true){
			const an = a.codePointAt(ai);
			const bn = b.codePointAt(bi);
			const distance = an-bn;


			
			ai += 1 + (an >= 0x10000);
			if (ai >= a.length)
				break;
			
			bi += 1 + (an >= 0x10000);
		}
	},
	
};

export default UnicodeType;