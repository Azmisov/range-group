/** Helpers for implementing methods in {@link StringRange} and {@link UnicodeType}. They are
 * provided publicly in case they can be useful for building other custom string-based types.
 * @namespace UnicodeHelpers
 */

/** Count number of unicode codepoints in a string, e.g. the UTF-32 encoded string length
 * @memberof UnicodeHelpers
 * @param {string} str the string to get the length of
 * @returns {number} the string length
 */
function length(str){
	let l = 0;
	for (const _ of str)
		l++;
	return l;
}
/** Compare the length of two strings, using the count of unicode codepoints
 * @memberof UnicodeHelpers
 * @param {string} a reference string
 * @param {string} b string to compare with
 * @returns {number} negative if `a` has less; 0 if equal; positive if `a` has more
 */
function compareLength(a, b){
	const a_max = a.length;
	const b_max = b.length;
	// optimization for single characters
	if (a_max === b_max && a_max === 1)
		return 0;
	// with surrogate pairs, the number of codepoints is between [ceil(v.length/2), v.length]
	const b_min = (b_max+1) >> 1;
	// -1: a_max < b_min
	if (a_max < b_min)
		return -1;
	const a_min = (a_max+1) >> 1;
	// 1: a_min > b_max
	if (a_min > b_max)
		return 1;
	// can't determine, compute lengths
	return length(a) - length(b);
}
/** Pairwise iteration of the codepoints of two equal length strings
 * @memberof UnicodeHelpers
 * @param {string} a first string
 * @param {string} b second string
 * @yields {number[]} tuple of codepoints `[a, b]`
 */
function* pairwiseIterate(a, b){
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
/** Get the last codepoint of a string
 * @memberof UnicodeHelpers
 * @param {string} str non-empty string to fetch the codepoint of
 * @returns {number} the codepoint
 */
function lastCodepoint(str){
	// UTF-16 (https://en.wikipedia.org/wiki/UTF-16) is self-synchronizing, so don't need to iterate full string;
	// check if surrogate pair first
	if (str.length > 1){
		const c = str.codePointAt(str.length-2);
		if (c >= 0x10000)
			return c;
	}
	// not a surrogate
	return str.codePointAt(str.length-1);
}

export {length, compareLength, pairwiseIterate, lastCodepoint};