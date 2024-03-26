import { onRender } from "postdoc/client";

onRender(
  () => {
    // dropdown

    const dropdownBtn = document.getElementById("dropdownBtn");
    const dropdownContent = document.querySelector(".dropdown-content");

    dropdownBtn.addEventListener("click", function () {
      if (dropdownContent.style.display === "block") {
        dropdownContent.style.display = "none";
      } else {
        dropdownContent.style.display = "block";
      }
    });

    window.addEventListener("click", function (event) {
      const dropdownBtn = document.getElementById("dropdownBtn");
      const dropdownContent = document.querySelector(".dropdown-content");
      if (event.target !== dropdownBtn) {
        dropdownContent.style.display = "none";
      }
    });

    // dark mode

    const toggle = document.getElementById("modeToggle");

    function setTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    }

    toggle.addEventListener("change", () => {
      if (toggle.checked) {
        setTheme("dark");
      } else {
        setTheme("light");
      }
    });

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
      toggle.checked = savedTheme === "dark";
    } else {
      setTheme("light");
    }
  },
  {
    forPage() {
      return true;
    },
  },
);

onRender(
  () => {
    // highlight right sidebar links

    const h2ElementsContainer = document.getElementById("content");
    const h2Elements = h2ElementsContainer.querySelectorAll("h2");
    const sidebarLinksContainer = document.getElementById("right-sidebar");
    const sidebarLinks =
      sidebarLinksContainer.querySelectorAll(".innerList li a");

    window.addEventListener("scroll", function () {
      const scrollPosition = window.scrollY;

      h2Elements.forEach((h2, index) => {
        const h2Position = h2.offsetTop;
        const headerHeight = 150;

        let threshold = headerHeight;

        if (index === h2Elements.length - 1) {
          threshold = 100;
        }

        if (
          scrollPosition >= h2Position - threshold &&
          scrollPosition < h2Position + headerHeight
        ) {
          sidebarLinks.forEach((link) => link.classList.remove("active"));
          sidebarLinks[index].classList.add("active");
        }
      });
    });
  },
  {
    forPage: /guide|api_reference/,
  },
);
