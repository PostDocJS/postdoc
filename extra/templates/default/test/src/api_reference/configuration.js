describe("api_reference page", function () {
  test("configuration example is present", function (browser) {
    const configuration = browser.page.api_reference.configuration();

    configuration.navigate().assert.visible("@exampleCode");

    browser.end();
  });
});
