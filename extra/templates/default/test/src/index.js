describe("home page", function () {
  test("hero image is visible", function (browser) {
    const homePage = browser.page.index();

    homePage.navigate().assert.visible("@heroImage");

    browser.end();
  });
});
