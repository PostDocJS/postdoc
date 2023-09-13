import { onRender } from 'postdoc/client';

onRender(() => {
    
// open left side menu on mobile

const toggleSidebarButton = document.getElementById('sideMenuButton');
const sidebar = document.getElementById('left-sidebar');

toggleSidebarButton.addEventListener('click', function() {
	sidebar.classList.toggle('open');
});

// open right side menu on mobile


const openModalButton = document.getElementById('modalButton');
const modal = document.getElementById('right-sidebar');

openModalButton.addEventListener('click', function() {
	modal.style.display = 'block';
});
window.addEventListener('click', function(event) {
	if (event.target == modal) {
		modal.style.display = 'none';
	}
});

}, {
	forPage() {
		return true;
	}
});
