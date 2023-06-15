# range-group

A `RangeGroup` is a data structure that holds a collection of one-dimensional ranges. It has builtin
support for integers, reals/floats, dates, unicode characters, and unicode strings. You can also
create your own `Range` type to integrate your own data types. It supports both inclusive (closed)
and exclusive (open) range bounds.  It has a comprehensive API for operations, such as searching,
set operations (like union or intersection), filtering, and more. It supports interpolation search
for `O(log(log(N)))` membership tests and `O(N*log(log(M)))` set operations. It can also fallback to
binary search for similar `log(N)` bounds.

Internally, it is storing a sorted, non-intersecting list of ranges. In many cases, it will
give you better memory usage and more efficient set operations over the builtin `Set` type.

[API documentation](https://azmisov.github.io/range-group) |
[npm package](https://www.npmjs.com/package/range-group) |
[GitHub source code](https://www.github.com/Azmisov/range-group)

## Installation

```
npm i range-group
```

This project uses ES 2015+ class features. A Babel transpiled and minified version is provided as
`rangegroup.compat.min.js`, with exports under `RangeGroup`; though I highly recommend building
a bundle yourself to customize the target and reduce code size. A plain minified version is provided
as `rangegroup.min.js`.

The builtin range types, like `IntType` or `DateType`, are tree-shakeable. Feel free to submit a
pull request to include another general purpose types you've made.

## Quickstart

Take a look at the API for more comprehensive class and method documentation.

```js
import { RangeGroup, ComparisonModes, IntType, RealType, ... } from "range-group";
```

If not using a bundler, you'll need to import from the minified version, which is pre-bundled.

A simple example:

```js
const group = new RangeGroup([0,5], {type:IntType});
group.has(5); // true
group.subtract([3,6]);
group.ranges; // [{start:0,end:3,endExcl:true}]
```

Most of the methods on `RangeGroup` require the **group** to be normalized (exceptions being things
like `copy`, `filter`, `isEmpty`, etc). This means the ranges are sorted and non-intersecting. The
`sort` and `selfUnion` methods can do this, or the `normalize` method which calls these. You can
also pass a `normalize` flag to the constructor:

```js
const group = new RangeGroup(
	// also demonstrating another syntax for specifying the initial ranges
	[{start:-2,end:-5}, {start:4,end:8}, {start:3,end:10}, {start:11,end:16}],
	{type: IntType, normalize: true}
);
group.ranges; // [{start: 3, end: 16}]
```

Note the first range was removed, since its end came before its start (`IntType` uses ascending
order). Additionally, the last two ranges were merged as there are no integers between 10 and 11.
These behaviors result from the implementation of `IntType.compare`.

The `RangeGroup.diff` method is the most powerful, and most operations are implemented as calls to
it. It can give you the difference between two groups:

```js
const a = new RangeGroup([0,7], {type:IntType});
const b = new RangeGroup([3,10], {type:IntType});
const diff = a.diff(b, {copy:true, track_sources:true, self_union:false});
console.log(diff.ranges);
/* [
	 {start:0, end:3, endExcl:true, a:0, b:null},
	 {start:3, end:7, a:0, b:0},
	 {start:7, end:10, startExcl:true, a:null, b:0},
   ]
*/
```

See how filtering these results can give you the various set operations. This is supported with the
`filter` option. For this and other options, logic has been added to optimize the work performed.

Setting `self_union=false` keeps the classified ranges separate rather than merging them
automatically. If later you want to perform additional diff operations, you'll need to put it into
normalized form by calling `selfUnion` (or `normalize`, though it will perform an extra unnecessary
sort).

## Builtin Types

A `RangeGroup` needs to be passed a `RangeType` object, which acts as interface between your `Range`
type and the methods inside `RangeGroup`. You can set a default type by changing
`RangeGroup.default_type`. The following builtin types are available:

| Type				|	Example
|-------------------|------------------
| IntType*			| `[0,5) [12,15] (20,Infinity]`
| RealType			| `[0,5.23) [12.5,16]`
| FloatNormType		| Same as `RealType`, but normalizes exclusive bounds to be inclusive
| DateType*			| `(new Date("04:30 1/12"), new Date("04:36 2/15)]`
| DateFloorType*	| Provides `Second`, `Minute`, `Hour`, and `Day` types, clamping to those time units
| UnicodeType*		| `[a, z] [f0, f9) [👦🏻, 👦🏿]`
| StringType		| Helpers for converting [string ranges]((https://www.unicode.org/reports/tr35/tr35html#String_Range)) to `UnicodeType`
| CommonType		| Helpers for implementing your own type

Ones marked with an asterisk/`*` also support a `Norm` type, e.g. `IntNormType` or
`DateFloorNormType`. These will automatically normalize the **range bounds** to be inclusive. By
default, ranges can be both open or closed, like the half-open interval `[0,3)` that got output in
the example above. If we instead used `IntNormType`, this would get automatically normalized to
`[0,2]` instead. This can be simpler to work with, and can improve performance.

There is no normalization for `RealType`, since there is no "next real number" you can modify to.
You can use the `FloatNormType` however, albeit with negative performance impact, to normalize to
the next representable floating point number.

## Custom Types

A design choice for the library was to decouple the `Range` and `RangeType` interfaces. This allows
`Range` to be a plain JSON object, with operations on those objects described by `RangeType`. To
create a new type, simply create an object with methods matching the `RangeType` interface. The
methods provided in `CommonType` can provide a starting place, or you might wrap any of the other
builtin types like `IntType`.

Additionally there are helpers like `CommonType.compareEpsilon`. It can wrap a type and define a
threshold to merge two ranges:

```js
const EpsilonType = CommonType.compareEpsilon(0.25, RealType)
const group = new RangeGroup(
	[[0,.1],[.3,.6]],
	{type:EpsilonType, normalize:true}
);
group.ranges; // {start:0, end:.6}
```

There is also `CommonType.compareBinarySearch`, which forces the type to use binary search instead
of interpolation search. Binary search has better worst case time complexity, and a little less
overhead, so can be a better choice in some scenarios.

## Method Reference

### General

- `copy`
- `sort`
- `normalize`: a combination of `sort` and `selfUnion`

### Set iteration
- `iterate`, `@@iterator`

### Set membership

- `contains` or `has`
- `search`: provides extra context about the found location

### Set modification

- `diff`
- `clear`, `toCleared`
- `filter`, `toFiltered`, `hasFilter`
- `union` or `add`, `toUnioned`, `hasUnion`
- `selfUnion`, `toSelfUnioned`, `hasSelfUnion`
- `difference` or `subtract` or `delete`, `toDifferenced`, `hasDifference`
- `intersect`, `toIntersected`, `hasIntersection`
- `symmetricDifference`, `toSymmetricDifferenced`, `hasSymmetricDifference`

You'll notice there are three variants for many:

1. The `modify` methods perform the operation in-place
2. The `toModified` methods perform the operation on a copy, following the naming syntax introduced
   in ECMAScript 2023
3. The `hasModification` methods give a boolean whether the result would be non-empty, without
   actually calculating the full results.

Most the operations are implemented using the `diff` method. It supports numerous options, like
customizing in-place vs copy, boolean results, filtering, and labeling the source `RangeGroup`. You
can use the `diff` calculate additional operations that have not been given aliases.

### Set characteristics

- `isEqual`: deep equality check
- `isEmpty`, `cardinality` or `size`,
- `isProperSubset` or `isStrictSubset`, `isSubset`
- `isProperSuperset` or `isStrictSuperset`, `isSuperset`




