import {onRender} from 'postdoc/client';

onRender(() => {
  const menuButton = document.querySelector('.menuButton');
  const docThemeContainer = document.querySelector('.docThemeContainer');

  menuButton.addEventListener('click', () => {
    docThemeContainer.classList.toggle('docThemeContainerVisible');

    document.body.style.overflow = docThemeContainer.classList.contains('docThemeContainerVisible') ? 'hidden' : null;
  });
}, {
  forPage() {
    return true;
  }
});
