describe('A ${page} page suite', () => {
  it('should contain heading 1', (browser) =>
    browser
      .url('http://127.0.0.1:${port}')
      .waitForElementVisible('body')
      .assert.visible('h1')
      .end());
});
