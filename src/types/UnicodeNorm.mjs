import IntNormType from "./IntNorm.mjs";
import { create, copy } from "./helpers/common.mjs";
import { compareLength, lastCodepoint } from "./helpers/unicode.mjs";

/** This is the same as {@link UnicodeType}, but where the range bounds have been normalized to
 * always be inclusive. This can be easier to work with, and omits the extra logic needed to handle
 * exclusive bounds.
 * 
 * This uses {@link IntNormType} internally for operations on codepoints.
 * @implements {RangeType}
 */
const UnicodeNormType = {
	base_type: IntNormType,
	create,
	copy,
	setStart(range, start, startExcl){
		const last = lastCodepoint(start);
		const prefix = start.slice(0, -last.length);
		this.base_type.setStart(range, last, startExcl);
		range.start = prefix+String.fromCodePoint(last);
	},
	setStart(range, end, endExcl){
		const last = lastCodepoint(end);
		const prefix = end.slice(0, -last.length);
		this.base_type.setStart(range, last, endExcl);
		range.end = prefix+String.fromCodePoint(last);
	},
	size(range){
		// delegate to base_type
		return this.base_type.size({
			start: lastCodepoint(range.start),
			end: lastCodepoint(range.end),
			startExcl: range.startExcl,
			endExcl: range.endExcl
		});
	},
	compare(mode, a, b, aExcl, bExcl){
		/* Can't sensibly measure distance for different string lengths or when there are
			differences in the non-last dimension. So we return infinity there, e.g. like they are
			separate number lines. This also means it will fallback to binary search in those cases
		*/
		let side = compare_unicode_length(a, b);
		// same lengths?
		degenerate: if (!side){
			// extract prefix; must be equal
			const a_last = lastCodepoint(a);
			const b_last = lastCodepoint(b);
			let a_prefix_len = a.length-a_last.length;
			let b_prefix_len = b.length-b_last.length;
			// quick check for inequality
			side = a_prefix_len - b_prefix_len;
			if (side)
				break degenerate;
			// need to do actual string comparison
			if (a_prefix_len){
				// this compares utf16 code units, rather than utf32; that's fine, since we are
				// just checking for degenerate comparisons anyways; it will be faster
				const a_prefix = a.substring(0, a_prefix_len);
				const b_prefix = b.substring(0, b_prefix_len);
				if (a_prefix !== b_prefix){
					side = a_prefix < b_prefix ? -1 : 1
					break degenerate;
				}
			}
			// okay to compare last code point;
			// delegate to base_type
			return this.base_type.compare(mode, a_last, b_last, aExcl, bExcl);
		}
		// degenerate case
		return {distance: side*Infinity, side};
	},
	*iterate(range, ...args){
		const start = lastCodepoint(range.start);
		// delegate to base_type
		const gen = this.base_type.iterate({
			start,
			end: lastCodepoint(range.end),
			startExcl: range.startExcl,
			endExcl: range.endExcl
		}, ...args);
		if (range.start.length !== start.length){
			const prefix = range.start.slice(0, -start.length);
			for (const code of gen)
				yield (prefix+String.fromCodePoint(code));
			return;
		}
		// optimized for no prefix
		for (const code of gen)
			yield (String.fromCodePoint(code));
	},
	// check that start/end are same length
	validate(range){
		return !compareLength(range.start, range.end);
	}
};

export default UnicodeNormType;