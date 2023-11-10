import { onRender } from "postdoc/client";

onRender(
  () => {
    // open / close left side menu on mobile

    const toggleSidebarButton = document.getElementById("sideMenuButton");
    const sidebar = document.getElementById("left-sidebar");
    const closeSidebarButton = document.getElementById("closeLeftSidebarButton");

    toggleSidebarButton.addEventListener("click", function () {
      sidebar.classList.add("open");
    });

    document.addEventListener("click", function (event) {
      if (!sidebar.contains(event.target) && !toggleSidebarButton.contains(event.target)) {
        sidebar.classList.remove("open");
      }
    });

    closeSidebarButton.addEventListener("click", function () {
      sidebar.classList.remove("open");
    });

    // open / close right side menu on mobile

    const openModalButton = document.getElementById("modalButton");
    const modal = document.getElementById("right-sidebar");
    const closeModalButton = document.getElementById("closeRightSidebarButton");
    const screenWidth = window.innerWidth;

    openModalButton.addEventListener("click", function () {
      modal.style.display = "block";
    });

    document.addEventListener("click", function (event) {
      if (modal.style.display === "block" && !modal.contains(event.target) && !openModalButton.contains(event.target)) {
        modal.style.display = "none";
      }
    });

    closeModalButton.addEventListener("click", function () {
      modal.style.display = "none";
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
