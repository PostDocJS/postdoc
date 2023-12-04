export default class Snapshot {
  static #parser = new DOMParser();

  static from(html) {
    return new this(this.#parser.parseFromString(html, "text/html"));
  }

  #head;
  #document;

  constructor(document) {
    this.#head = document.head;
    this.#document = document;

    this.#moveStylesToHeadIfNeeded();
  }

  get body() {
    return this.#document.body;
  }

  get readyState() {
    return this.#document.readyState;
  }

  get #language() {
    return this.#document.documentElement.getAttribute("lang");
  }

  async into(activeSnapshot) {
    activeSnapshot.#setLanguage(this.#language);

    await this.#mergeHeadInto(activeSnapshot);

    this.#injectBodyInto(activeSnapshot);
  }

  createElement(name) {
    return this.#document.createElement(name);
  }

  async #mergeHeadInto(activeSnapshot) {
    activeSnapshot.#document.adoptNode(this.#head);

    activeSnapshot.#mergeRegularHeadElements(
      this.#getHeadElementsByType("regular"),
    );
    await activeSnapshot.#mergeStyleHeadElements(
      this.#getHeadElementsByType("style"),
    );
    activeSnapshot.#mergeScriptHeadElements(
      this.#getHeadElementsByType("script"),
    );
  }

  #injectBodyInto(activeSnapshot) {
    const adoptedBody = activeSnapshot.#document.adoptNode(this.#document.body);

    for (const scriptElement of adoptedBody.querySelectorAll("script")) {
      scriptElement.replaceWith(this.#activateScriptElement(scriptElement));
    }

    activeSnapshot.#document.body.replaceWith(adoptedBody);
  }

  #mergeRegularHeadElements(newRegularHeadElements) {
    for (const element of this.#getHeadElementsByType("regular")) {
      if (!this.#checkElementInListAndRemove(element, newRegularHeadElements)) {
        this.#head.removeChild(element);
      }
    }

    newRegularHeadElements.forEach((newElement) =>
      this.#head.append(newElement),
    );
  }

  #mergeStyleHeadElements(newStyleHeadElements) {
    for (const element of this.#getHeadElementsByType("style")) {
      this.#checkElementInListAndRemove(element, newStyleHeadElements);
    }

    const pendingStyles = newStyleHeadElements.map((element) => {
      const promise = this.#waitForLoad(element);

      this.#head.append(element);

      return promise;
    });

    return Promise.all(pendingStyles);
  }

  #mergeScriptHeadElements(newScriptHeadElements) {
    this.#getHeadElementsByType("script").forEach((element) =>
      this.#head.removeChild(element),
    );

    newScriptHeadElements.forEach((element) =>
      this.#head.append(this.#activateScriptElement(element)),
    );
  }

  #activateScriptElement(element) {
    const createdScriptElement = this.createElement("script");

    createdScriptElement.textContent = element.textContent;
    createdScriptElement.async = false;

    for (const { name, value } of element.attributes) {
      createdScriptElement.setAttribute(name, value);
    }

    return createdScriptElement;
  }

  #waitForLoad(element, timeout = 2000) {
    return new Promise((resolve) => {
      const onComplete = () => {
        element.removeEventListener("error", onComplete);
        element.removeEventListener("load", onComplete);
        resolve();
      };

      element.addEventListener("load", onComplete, { once: true });
      element.addEventListener("error", onComplete, { once: true });
      setTimeout(resolve, timeout);
    });
  }

  #checkElementInListAndRemove(element, list) {
    const areStylesCompared = this.#isStyle(element);

    return list.some((listElement, index) => {
      const areEqual = areStylesCompared
        ? element.href === listElement.href
        : element.isEqualNode(listElement);

      if (areEqual) {
        list.splice(index, 1);
      }

      return areEqual;
    });
  }

  #setLanguage(language) {
    if (language) {
      this.#document.documentElement.setAttribute("lang", language);
    } else {
      this.#document.documentElement.removeAttribute("lang");
    }
  }

  #getElementType(element) {
    if (this.#isStyle(element)) {
      return "style";
    } else if (this.#isScript(element)) {
      return "script";
    } else {
      return "regular";
    }
  }

  #getHeadElementsByType(type) {
    return Array.from(this.#head.children).filter(
      (element) => this.#getElementType(element) === type,
    );
  }

  #isScript(element) {
    return element.tagName === "SCRIPT";
  }

  #isStyle(element) {
    return (
      element.tagName === "STYLE" ||
      (element.tagName === "LINK" &&
        (element.rel === "stylesheet" || element.href.endsWith(".css")))
    );
  }

  #moveStylesToHeadIfNeeded() {
    const walker = this.#document.createTreeWalker(
      this.#document.documentElement,
      NodeFilter.SHOW_ELEMENT,
    );

    while (walker.nextNode()) {
      if (
        this.#isStyle(walker.currentNode) &&
        !this.#head.contains(walker.currentNode)
      ) {
        this.#head.append(walker.currentNode);
      }
    }
  }
}
