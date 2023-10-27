import { ok, strictEqual, throws, deepStrictEqual } from "node:assert";

import { it, describe, afterEach } from "mocha";

import {
  clearCache,
  hasCacheEntry,
  getCacheEntry,
  addCacheEntry,
  removeCacheEntry,
  descriptorShouldBeFor,
  getCacheKeyDescriptorsByParts,
} from "../../lib/bundler/cache.js";

describe("bundler's cache", function () {
  afterEach(function () {
    clearCache();
  });

  it("should allow basic operations: get, set, has, and remove", function () {
    ok(!hasCacheEntry(["foo"]));

    addCacheEntry(["foo"], "baz");

    ok(hasCacheEntry(["foo"]));

    removeCacheEntry(["foo"]);

    ok(!hasCacheEntry(["foo"]));

    addCacheEntry(["bar"], "abcd");

    strictEqual(getCacheEntry(["bar"]), "abcd");

    clearCache();

    ok(!hasCacheEntry(["bar"]));
  });

  it("array descriptor should be an array", function () {
    throws(() => hasCacheEntry(""));
  });

  it("descriptorShouldBeFor must return true if a descriptor ends with the given descriptor part", function () {
    const descriptors = [
      ["a", "k", "b"],
      ["a", "b", "u"],
      ["p", "a", "b", "g"],
      ["p", "a", "b", "g", "b"],
      ["a", "b", "c"],
    ];

    const result = descriptors.filter(descriptorShouldBeFor("b"));

    deepStrictEqual(result, [
      ["a", "k", "b"],
      ["p", "a", "b", "g", "b"],
    ]);
  });

  it("should accept an object with some data as the descriptor's part", function () {
    const keyDescriptor = [{ file: "boo", data: { page: 1, custom: [true] } }];

    addCacheEntry(keyDescriptor, "baz");

    ok(!hasCacheEntry(["foo"]));
    ok(hasCacheEntry(keyDescriptor));
  });

  it("should create different entries for key descriptors which has the same file path, but different data", function () {
    const descriptor1 = [{ file: "a", data: { bar: 1 } }];
    const descriptor2 = [{ file: "a", data: { bar: 2 } }];

    addCacheEntry(descriptor1, "foo");
    addCacheEntry(descriptor2, "baz");

    strictEqual(getCacheEntry(descriptor1), "foo");
    strictEqual(getCacheEntry(descriptor2), "baz");
  });

  it("getCacheKeyDescriptorsByParts should return all descriptors which match the given partial descriptor", function () {
    addCacheEntry(["a"], "foo");
    addCacheEntry(["b", "a"], "foo");
    addCacheEntry(["a", "c", "k"], "foo");
    addCacheEntry(["a", "o", "d"], "foo");
    addCacheEntry(["a", "b"], "foo");
    addCacheEntry(["c", "a", "b"], "foo");
    addCacheEntry(["c", { file: "a", data: [] }, "b"], "foo");

    const descriptors = getCacheKeyDescriptorsByParts(["a", "b"]);

    deepStrictEqual(descriptors, [
      ["b", "a"],
      ["a", "b"],
      ["c", "a", "b"],
      ["c", { file: "a", data: [] }, "b"],
    ]);
  });

  it("getCacheKeyDescriptorsByParts should return all descriptors which strictly match the given object part", function () {
    const descriptor1 = [{ file: "a", data: [true] }, "b"];
    const descriptor2 = [{ file: "a", data: [1] }, "b"];
    const descriptor3 = [{ file: "a", data: {} }, "b"];

    addCacheEntry(descriptor1, "foo");
    addCacheEntry(descriptor2, "foo");
    addCacheEntry(descriptor3, "foo");

    const descriptors = getCacheKeyDescriptorsByParts({ file: "a", data: {} });

    deepStrictEqual(descriptors, [descriptor3]);
  });
});
