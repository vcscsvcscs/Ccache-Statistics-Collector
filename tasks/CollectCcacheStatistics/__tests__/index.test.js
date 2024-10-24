const { collectCcacheStatistics } = require('../index');

test('collectCcacheStatistics should return the correct statistics', () => {
  // Test case 1
  const result1 = collectCcacheStatistics('path/to/ccache');
  expect(result1).toEqual({
    cacheHits: 100,
    cacheMisses: 50,
    hitRate: 0.67,
  });

  // Test case 2
  const result2 = collectCcacheStatistics('path/to/ccache');
  expect(result2).toEqual({
    cacheHits: 200,
    cacheMisses: 100,
    hitRate: 0.67,
  });
});