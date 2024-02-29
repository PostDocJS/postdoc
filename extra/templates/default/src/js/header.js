import { onRender } from "postdoc/client";

onRender(
  () => {
    const menuButton = document.querySelector(".menuButton");
    const docThemeContainer = document.querySelector(".docThemeContainer");

    menuButton.addEventListener("click", () => {
      docThemeContainer.classList.toggle("docThemeContainerVisible");

      document.body.style.overflow = docThemeContainer.classList.contains(
        "docThemeContainerVisible",
      )
        ? "hidden"
        : null;
    });
    // search modal

    document
      .querySelector(".docThemeSearchBox")
      .addEventListener("click", function () {
        document.getElementById("mySearchModal").style.display = "block";
      });

    document
      .querySelector(".docThemeSearchBoxMobile")
      .addEventListener("click", function () {
        document.getElementById("mySearchModal").style.display = "block";
      });

    document
      .getElementById("mySearchModal")
      .addEventListener("click", function (event) {
        if (event.target == this) {
          this.style.display = "none";
        }
      });
  },
  {
    forPage() {
      return true;
    },
  },
);
