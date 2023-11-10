describe('guide page', function () {
	test('right sidebar is visible', function (browser) {
		const guide = browser.page.guide();

		guide
			.navigate()
			.assert.visible('@rightSidebar');

		browser.end();
	});

	test('second heading is visible', function (browser) {
		const guide = browser.page.guide();

		guide
			.navigate()
			.assert.visible('@part1Heading');

		browser.end();
	});
});
