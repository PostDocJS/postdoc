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
