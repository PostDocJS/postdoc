import {
  clearCache,
  hasCacheEntry,
  getCacheEntry,
  addCacheEntry,
  removeCacheEntry,
  descriptorShouldBeFor,
  getCacheKeyDescriptorsByParts,
} from "../../../lib/bundler/cache.js";

describe("bundler's cache", function () {
  afterEach(function (client, done) {
    clearCache();
    done();
  });

  it("should allow basic operations: get, set, has, and remove", function (client) {
    client.assert.ok(!hasCacheEntry(["foo"]));

    addCacheEntry(["foo"], "baz");

    client.assert.ok(hasCacheEntry(["foo"]));

    removeCacheEntry(["foo"]);

    client.assert.ok(!hasCacheEntry(["foo"]));

    addCacheEntry(["bar"], "abcd");

    client.assert.strictEqual(getCacheEntry(["bar"]), "abcd");

    clearCache();

    client.assert.ok(!hasCacheEntry(["bar"]));
  });

  it("array descriptor should be an array", function (client) {
    client.assert.throws(() => hasCacheEntry(""));
  });

  it("descriptorShouldBeFor must return true if a descriptor ends with the given descriptor part", function (client) {
    const descriptors = [
      ["a", "k", "b"],
      ["a", "b", "u"],
      ["p", "a", "b", "g"],
      ["p", "a", "b", "g", "b"],
      ["a", "b", "c"],
    ];

    const result = descriptors.filter(descriptorShouldBeFor("b"));

    client.assert.deepStrictEqual(result, [
      ["a", "k", "b"],
      ["p", "a", "b", "g", "b"],
    ]);
  });

  it("should accept an object with some data as the descriptor's part", function (client) {
    const keyDescriptor = [{ file: "boo", data: { page: 1, custom: [true] } }];

    addCacheEntry(keyDescriptor, "baz");

    client.assert.ok(!hasCacheEntry(["foo"]));
    client.assert.ok(hasCacheEntry(keyDescriptor));
  });

  it("should create different entries for key descriptors which has the same file path, but different data", function (client) {
    const descriptor1 = [{ file: "a", data: { bar: 1 } }];
    const descriptor2 = [{ file: "a", data: { bar: 2 } }];

    addCacheEntry(descriptor1, "foo");
    addCacheEntry(descriptor2, "baz");

    client.assert.strictEqual(getCacheEntry(descriptor1), "foo");
    client.assert.strictEqual(getCacheEntry(descriptor2), "baz");
  });

  it("getCacheKeyDescriptorsByParts should return all descriptors which match the given partial descriptor", function (client) {
    addCacheEntry(["a"], "foo");
    addCacheEntry(["b", "a"], "foo");
    addCacheEntry(["a", "c", "k"], "foo");
    addCacheEntry(["a", "o", "d"], "foo");
    addCacheEntry(["a", "b"], "foo");
    addCacheEntry(["c", "a", "b"], "foo");
    addCacheEntry(["c", { file: "a", data: [] }, "b"], "foo");

    const descriptors = getCacheKeyDescriptorsByParts(["a", "b"]);

    client.assert.deepStrictEqual(descriptors, [
      ["b", "a"],
      ["a", "b"],
      ["c", "a", "b"],
      ["c", { file: "a", data: [] }, "b"],
    ]);
  });

  it("getCacheKeyDescriptorsByParts should return all descriptors which strictly match the given object part", function (client) {
    const descriptor1 = [{ file: "a", data: [true] }, "b"];
    const descriptor2 = [{ file: "a", data: [1] }, "b"];
    const descriptor3 = [{ file: "a", data: {} }, "b"];

    addCacheEntry(descriptor1, "foo");
    addCacheEntry(descriptor2, "foo");
    addCacheEntry(descriptor3, "foo");

    const descriptors = getCacheKeyDescriptorsByParts({ file: "a", data: {} });

    client.assert.deepStrictEqual(descriptors, [descriptor3]);
  });
});
