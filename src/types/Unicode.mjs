import { setStart, setEnd } from "./helpers/common.mjs";
import UnicodeNormType from "./UnicodeNorm.mjs";
import IntType from "./Int.mjs";

/** Implementation of {@link RangeType} for unicode codepoints. This also supports a fixed string
 * prefix to the codepoint, which is used to accomodate *string ranges* in a limited fashion. String
 * ranges are used to encode a set of strings, as opposed to single characters. See the
 * {@link StringRange} documentation for more details on this topic.
 * 
 * Ranges are compared by the number of codepoints first (e.g. the string length in UTF-32
 * encoding), then by their prefix, then by their final codepoint. Distances are always infinite
 * unless the two strings have the same length and prefix.
 * 
 * To create a valid {@link Range}, the following must be true of {@link Range#start} and {@link Range#end}:
 * - the UTF-32 string length must be equal
 * - all but the last codepoint must be equal (the prefixes)
 * - the last codepoint of {@link Range#end} should be greater or equal
 * 
 * Like all other builtin types, for performance no validation is performed when you call
 * {@link RangeType.setStart} or {@link RangeType.setEnd}. As strings can be more tricky to work
 * with (e.g. the unicode string length is not immediately obvious with grapheme clusters), you can
 * call `UnicodeType.validate(range) -> bool` to double check if a range is valid. This is simply
 * transforming the result of `UnicodeType.compare` to a boolean.
 * 
 * This uses {@link IntType} internally for operations on codepoints.
 * @implements {RangeType}
 */
const UnicodeType = Object.assign({}, UnicodeNormType);
UnicodeType.base_type = IntType;
// no need for special handling here
UnicodeType.setStart = setStart;
UnicodeType.setEnd = setEnd;
export default UnicodeType;