import { onRender } from "postdoc/client";

onRender(
  () => {
    // open left side menu on mobile

    const toggleSidebarButton = document.getElementById("sideMenuButton");
    const sidebar = document.getElementById("left-sidebar");

    toggleSidebarButton.addEventListener("click", function () {
      sidebar.classList.toggle("open");
    });

    // open right side menu on mobile

    const openModalButton = document.getElementById("modalButton");
    const modal = document.getElementById("right-sidebar");

    openModalButton.addEventListener("click", function () {
      modal.style.display = "block";
    });
    if (screenWidth <= 992) {
      window.addEventListener("click", function (event) {
        if (event.target === modal) {
          modal.style.display = "none";
        }
      });
    }
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
