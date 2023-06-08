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
 * When creating a range, the UTF-32 string length of {@link Range#start} and {@link Range#end} must
 * be equal. For performance, no validation is performed when you call {@link RangeType.setStart} or
 * {@link RangeType.setEnd} manually. You can call `UnicodeType.validate(range) -> bool` to manually
 * check if a range is valid.
 * 
 * This uses {@link IntType} internally for operations on codepoints.
 * @implements {RangeType}
 */
const UnicodeType = Object.assign({}, UnicodeNormType);
UnicodeType.base_type = IntType;
export default UnicodeType;