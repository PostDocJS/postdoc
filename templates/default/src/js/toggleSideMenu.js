import { onRender } from "postdoc/client";

onRender(
  () => {
    // open / close left side menu on mobile

    const toggleSidebarButton = document.getElementById("sideMenuButton");
    const sidebar = document.getElementById("left-sidebar");
    const closeSidebarButton = document.getElementById(
      "closeLeftSidebarButton",
    );

    toggleSidebarButton.addEventListener("click", function () {
      sidebar.classList.add("open");
    });

    document.addEventListener("click", function (event) {
      if (
        !sidebar.contains(event.target) &&
        !toggleSidebarButton.contains(event.target)
      ) {
        sidebar.classList.remove("open");
      }
    });

    closeSidebarButton.addEventListener("click", function () {
      sidebar.classList.remove("open");
    });

    // open / close right side menu on mobile

    const openModalButton = document.getElementById("modalButton");
    const modal = document.getElementById("right-sidebar");
    const closeModalButton = document.querySelector(
      ".right-sidebar-close-button",
    );
    const rightModalLinks = modal.querySelectorAll("a");

    rightModalLinks.forEach((link) => {
      link.addEventListener("click", () => {
        modal.classList.remove("opened");
        document.body.classList.remove("overflow-hidden");
      });
    });

    openModalButton.addEventListener("click", function () {
      modal.classList.add("opened");
      document.body.classList.add("overflow-hidden");
    });

    document.addEventListener("click", function (event) {
      const eventBubblingPath = event.composedPath();

      if (
        eventBubblingPath.includes(modal) ||
        eventBubblingPath.includes(openModalButton)
      )
        return;

      modal.classList.remove("opened");
      document.body.classList.remove("overflow-hidden");
    });

    closeModalButton.addEventListener("click", function () {
      modal.classList.remove("opened");
      document.body.classList.remove("overflow-hidden");
    });
  },
  {
    forPage(url) {
      return (
        url.pathname.startsWith("/guide") ||
        url.pathname.startsWith("/api_reference")
      );
    },
  },
);
