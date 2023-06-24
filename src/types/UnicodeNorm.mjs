import IntNormType from "./IntNorm.mjs";
import { create, copy } from "./helpers/common.mjs";
import { compareLength, lastCodepoint, utf16Length } from "./helpers/unicode.mjs";

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
	toBaseTypeRange(range){
		return {
			start: lastCodepoint(range.start),
			end: lastCodepoint(range.end),
			startExcl: range.startExcl,
			endExcl: range.endExcl
		};
	},
	setStart(range, start, startExcl){
		const last = lastCodepoint(start);
		const prefix = start.slice(0, -utf16Length(last));
		this.base_type.setStart(range, last, startExcl);
		range.start = prefix+String.fromCodePoint(range.start);
		return range;
	},
	setEnd(range, end, endExcl){
		const last = lastCodepoint(end);
		const prefix = end.slice(0, -utf16Length(last));
		this.base_type.setEnd(range, last, endExcl);
		range.end = prefix+String.fromCodePoint(range.end);
		return range;
	},
	size(range){
		// delegate to base_type
		return this.base_type.size(this.toBaseTypeRange(range));
	},
	sample(range, i){
		const base = this.toBaseTypeRange(range);
		const base_len = utf16Length(base.start);
		const prefix = range.start.slice(0, -base_len);
		const s = this.base_type.sample(base, i);
		return prefix + String.fromCodePoint(s);
	},
	compare(mode, a, b, aExcl, bExcl){
		/* Can't sensibly measure distance for different string lengths or when there are
			differences in the non-last dimension. So we return infinity there, e.g. like they are
			separate number lines. This also means it will fallback to binary search in those cases
		*/
		let side = compareLength(a, b);
		// same lengths?
		degenerate: if (!side){
			// extract prefix; must be equal
			const a_last = lastCodepoint(a);
			const b_last = lastCodepoint(b);
			let a_prefix_len = a.length - utf16Length(a_last);
			let b_prefix_len = b.length - utf16Length(b_last);
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
		const start_len = utf16Length(start);
		// delegate to base_type
		const gen = this.base_type.iterate({
			start,
			end: lastCodepoint(range.end),
			startExcl: range.startExcl,
			endExcl: range.endExcl
		}, ...args);
		if (range.start.length !== start_len){
			const prefix = range.start.slice(0, -start_len);
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
		const res = this.compare(0b10, range.start, range.end, range.startExcl, range.endExcl);
		return isFinite(res.distance) && res.side <= 0;
	}
};

export default UnicodeNormType;